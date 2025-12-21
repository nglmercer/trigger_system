
import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { EventEmitter } from "events";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import { StateManager } from "../../src/core/state-manager";
import type { TriggerRule } from "../../src/types";

// --- Mock Playlist Manager ---
// Simulates the behavior of the real PlaylistManager without audio dependencies

class MockPlaylistManager extends EventEmitter {
    tracks: string[] = [];
    currentIndex: number = 0;
    isPlaying: boolean = false;
    isLooping: boolean = false;
    private playbackTimer: Timer | null = null;
    private stateManager: StateManager;

    constructor() {
        super();
        this.stateManager = StateManager.getInstance();
        this.syncState();
    }

    private async syncState() {
        // Store as a nested object so ExpressionEngine can traverse "state.playlist.index"
        await this.stateManager.set("playlist", {
            tracks: this.tracks,
            index: this.currentIndex,
            playing: this.isPlaying,
            current_track: this.tracks[this.currentIndex] || null
        });
    }

    async load(tracks: string[]) {
        this.tracks = tracks;
        this.currentIndex = 0;
        this.emit('loaded', { count: tracks.length });
        await this.syncState();
    }

    async play() {
        if (this.tracks.length === 0) return;
        
        // Resume functionality or start new
        if (this.isPlaying) return;

        this.isPlaying = true;
        await this.syncState();
        
        this.emit('playing', { track: this.tracks[this.currentIndex], index: this.currentIndex });
        
        // Simulate track duration for testing (e.g., 50ms per track)
        this.playbackTimer = setTimeout(() => {
            this.finishTrack();
        }, 50);
    }

    async pause() {
        this.isPlaying = false;
        if (this.playbackTimer) clearTimeout(this.playbackTimer);
        await this.syncState();
        this.emit('paused');
    }

    async next() {
        this.finishTrack(); // Manual skip behaves like finishing
    }

    async setLoop(enable: boolean) {
        this.isLooping = enable;
        await this.stateManager.set("playlist.loop", enable); // Sync Loop state too
    }

    private async finishTrack() {
        if (!this.isPlaying) return;

        this.emit('track_finished', { index: this.currentIndex });

        if (this.currentIndex < this.tracks.length - 1) {
            this.currentIndex++;
            await this.syncState(); // Sync on change
            
            // Auto-play next
            this.emit('playing', { track: this.tracks[this.currentIndex], index: this.currentIndex });
            this.playbackTimer = setTimeout(() => this.finishTrack(), 50);
        } else {
            // End of playlist
            if (this.isLooping) {
                this.currentIndex = 0;
                await this.syncState(); // Sync on loop
                
                this.emit('looping');
                this.emit('playing', { track: this.tracks[this.currentIndex], index: this.currentIndex });
                this.playbackTimer = setTimeout(() => this.finishTrack(), 50);
            } else {
                this.isPlaying = false;
                await this.syncState(); // Sync on finish
                
                this.emit('playlist_finished');
            }
        }
    }
}

// --- Integration Tests ---

describe("Playlist Logic & Rules Integration", () => {
    
    let mockPlaylist: MockPlaylistManager;
    let engine: RuleEngine;
    const registry = ActionRegistry.getInstance();
    const stateManager = StateManager.getInstance();

    beforeEach(async () => {
        await stateManager.clear(); // Reset state between tests
        mockPlaylist = new MockPlaylistManager();

        // Register Playlist Actions available to the Rule Engine
        
        registry.register("PLAYLIST_LOAD", async (action, ctx) => {
            const tracks = action.params?.tracks || [];
            await mockPlaylist.load(tracks);
            return { loaded: tracks.length };
        });

        registry.register("PLAYLIST_PLAY", async () => {
             await mockPlaylist.play();
             return { status: "started" };
        });

        registry.register("PLAYLIST_PAUSE", async () => {
            await mockPlaylist.pause();
            return { status: "paused" };
       });

       registry.register("PLAYLIST_LOOP", async (action) => {
           const enable = action.params?.enable ?? true;
           await mockPlaylist.setLoop(enable);
           return { loop: enable };
       });
    });

    afterEach(() => {
        mockPlaylist.pause(); // Cleanup timers
        mockPlaylist.removeAllListeners();
    });

    test("Scenario: Load tracks -> Play -> Auto Advance -> Finish", async () => {
        const events: string[] = [];
        
        // Listen to mock events to verify sequence
        mockPlaylist.on('playing', (info) => events.push(`started_${info.index}`));
        mockPlaylist.on('playlist_finished', () => events.push('finished'));

        // Define Rules
        const rules: TriggerRule[] = [
            {
                id: "init-playlist",
                on: "SYSTEM_INIT",
                do: {
                    type: "PLAYLIST_LOAD",
                    params: { tracks: ["intro.mp3", "news.mp3", "outro.mp3"] }
                }
            },
            {
                id: "start-playback",
                on: "USER_COMMAND_PLAY",
                do: { type: "PLAYLIST_PLAY" }
            }
        ];

        engine = new RuleEngine({ rules, globalSettings: { evaluateAll: true } });

        // 1. Initialize
        await engine.evaluateContext({ event: "SYSTEM_INIT", id: "1", timestamp: Date.now(), data: {} });
        expect(mockPlaylist.tracks).toHaveLength(3);

        // 2. Start Playback
        await engine.evaluateContext({ event: "USER_COMMAND_PLAY", id: "2", timestamp: Date.now(), data: {} });
        expect(mockPlaylist.isPlaying).toBe(true);

        // 3. Wait for simulation (3 tracks * 50ms + buffers = ~200ms)
        await new Promise(r => setTimeout(r, 300));

        // Verify Sequence
        // Should have played 0, then 1, then 2, then finished
        expect(events).toEqual(["started_0", "started_1", "started_2", "finished"]);
        expect(mockPlaylist.isPlaying).toBe(false);
    });

    test("Scenario: Loop Mode", async () => {
        const playedIndices: number[] = [];
        mockPlaylist.on('playing', (info) => playedIndices.push(info.index));

        const rules: TriggerRule[] = [
            {
                id: "setup-loop",
                on: "SETUP",
                do: {
                    mode: "SEQUENCE",
                    actions: [
                        { type: "PLAYLIST_LOAD", params: { tracks: ["A", "B"] } },
                        { type: "PLAYLIST_LOOP", params: { enable: true } },
                        { type: "PLAYLIST_PLAY" }
                    ]
                }
            }
        ];

        engine = new RuleEngine({ rules, globalSettings: { evaluateAll: true } });

        // Run
        await engine.evaluateContext({ event: "SETUP", id: "1", timestamp: Date.now(), data: {} });

        // Wait enough for A -> B -> A
        // 50ms * 3 = 150ms
        await new Promise(r => setTimeout(r, 200));

        // Check that it looped back to 0
        // Expect: 0, 1, 0...
        expect(playedIndices.length).toBeGreaterThanOrEqual(3);
        expect(playedIndices[0]).toBe(0);
        expect(playedIndices[1]).toBe(1);
        expect(playedIndices[2]).toBe(0); // Looped
    });

    // --- NEW TEST: State Awareness & Reaction ---

    test("Scenario: Rule reacts to Playlist State Change", async () => {
        // Goal: Verify that a rule can check 'state.playlist.index' and fire when it changes.
        // We will simulate the "Event Bus" triggering the rule engine when the playlist emits 'playing'.

        let reactingRuleFired = false;

        const rules: TriggerRule[] = [
            // Rule 1: Setup
            {
                id: "setup",
                on: "SETUP",
                do: { 
                    type: "PLAYLIST_LOAD", 
                    params: { tracks: ["First", "Second"] } 
                }
            },
            // Rule 2: Trigger play
            {
                id: "play",
                on: "PLAY",
                do: { type: "PLAYLIST_PLAY" }
            },
            // Rule 3: The Reaction Rule
            // This rule listens for 'TRACK_CHANGED' event (emitted by our bus adapter)
            // And checks if the *state* index is 1 (the second track)
            {
                id: "react-to-second-track",
                on: "TRACK_STARTED",
                if: {
                    field: "state.playlist.index", // Accessing Global State
                    operator: "EQ",
                    value: 1
                },
                do: {
                    type: "STATE_SET",
                    params: { key: "reaction_success", value: true }
                }
            }
        ];

        engine = new RuleEngine({ rules, globalSettings: { evaluateAll: true } });

        // 1. Setup
        await engine.evaluateContext({ event: "SETUP", id: "1", timestamp: Date.now(), data: {} });

        // 2. Hook up the "Event Bus Adapter"
        // When playlist emits 'playing', we trigger the engine with 'TRACK_STARTED'
        mockPlaylist.on('playing', async (info) => {
            // Note: In real app this would be decoupled, but here we just call engine directly
            await engine.evaluateContext({ 
                event: "TRACK_STARTED", 
                id: `evt_${Date.now()}`, 
                timestamp: Date.now(), 
                data: { track: info.track } 
            });
        });

        // 3. Play
        await engine.evaluateContext({ event: "PLAY", id: "2", timestamp: Date.now(), data: {} });

        // 4. Wait for playback to reach track 1
        // Track 0 (0ms) -> Track 1 (50ms)
        await new Promise(r => setTimeout(r, 100));

        // 5. Verify
        // The rule 'react-to-second-track' should have fired when index became 1.
        // It sets 'reaction_success' to true in state.
        const success = stateManager.get("reaction_success");
        expect(success).toBe(true);
        expect(stateManager.get("playlist").index).toBe(1); // Confirm state is synced
    });
});
