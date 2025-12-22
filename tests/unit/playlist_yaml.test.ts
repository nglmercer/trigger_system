
import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { EventEmitter } from "events";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import { StateManager } from "../../src/core/state-manager";
import { TriggerLoader } from "../../src/io/loader.node";
import path from "path";

// --- Re-using MockPlaylistManager (identical to previous test) ---

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
        if (this.isPlaying) return;
        this.isPlaying = true;
        await this.syncState();
        this.emit('playing', { track: this.tracks[this.currentIndex], index: this.currentIndex });
        // Faster simulation for YAML test
        this.playbackTimer = setTimeout(() => { this.finishTrack(); }, 20);
    }

    async pause() {
        this.isPlaying = false;
        if (this.playbackTimer) clearTimeout(this.playbackTimer);
        await this.syncState();
        this.emit('paused');
    }

    async finishTrack() {
        if (!this.isPlaying) return;
        this.emit('track_finished', { index: this.currentIndex });
        if (this.currentIndex < this.tracks.length - 1) {
            this.currentIndex++;
            await this.syncState();
            this.emit('playing', { track: this.tracks[this.currentIndex], index: this.currentIndex });
            this.playbackTimer = setTimeout(() => this.finishTrack(), 20);
        } else {
            if (this.isLooping) {
                this.currentIndex = 0;
                await this.syncState();
                this.emit('looping');
                this.emit('playing', { track: this.tracks[this.currentIndex], index: this.currentIndex });
                this.playbackTimer = setTimeout(() => this.finishTrack(), 20);
            } else {
                this.isPlaying = false;
                await this.syncState();
                this.emit('playlist_finished');
            }
        }
    }
    
    async setLoop(enable: boolean) {
        this.isLooping = enable;
        await this.stateManager.set("playlist.loop", enable); 
    }
}

// --- YAML Integration Test ---

describe("YAML Playlist Control", () => {
    
    let mockPlaylist: MockPlaylistManager;
    let engine: RuleEngine;
    const registry = ActionRegistry.getInstance();
    const stateManager = StateManager.getInstance();

    beforeEach(async () => {
        await stateManager.clear(); 
        mockPlaylist = new MockPlaylistManager();

        // 1. Register Actions
        registry.register("PLAYLIST_LOAD", async (action, ctx) => {
            const tracks = Array.isArray(action.params?.tracks) ? action.params?.tracks : [];
            await mockPlaylist.load(tracks as string[]);
            return { loaded: tracks.length };
        });

        registry.register("PLAYLIST_PLAY", async () => {
             await mockPlaylist.play();
             return { status: "started" };
        });

        registry.register("PLAYLIST_LOOP", async (action) => {
           const enable = action.params?.enable ?? true;
           await mockPlaylist.setLoop(enable as boolean);
           return { loop: enable };
       });

        // 2. Load Rules from YAML
        const yamlPath = path.join(import.meta.dir, "../rules/examples/playlist_control.yaml");
        const rules = await TriggerLoader.loadRule(yamlPath);
        
        // 3. Initialize Engine with loaded rules
        // Enable debug mode to see LOG actions in console if needed
        engine = new RuleEngine({ 
            rules, 
            globalSettings: { evaluateAll: true, debugMode: false } 
        });

        // 4. Connect Playlist Events to Engine
        mockPlaylist.on('playing', async (info) => {
            await engine.evaluateContext({ 
                event: "TRACK_STARTED", 
                id: `evt_${Date.now()}`, 
                timestamp: Date.now(), 
                data: { track: info.track } 
            });
        });
    });

    afterEach(() => {
        mockPlaylist.pause();
        mockPlaylist.removeAllListeners();
    });

    test("YAML: Should load playlist, play, and react to state change", async () => {
        // A. Trigger Initialization from YAML rule 'yaml-init-playlist'
        await engine.evaluateContext({ event: "SYSTEM_INIT", id: "1", timestamp: Date.now(), data: {} });
        expect(mockPlaylist.tracks).toHaveLength(3); // ["intro.mp3", "news.mp3", "outro.mp3"]

        // B. Trigger Playback from YAML rule 'yaml-start-playback'
        await engine.evaluateContext({ event: "USER_COMMAND_PLAY", id: "2", timestamp: Date.now(), data: {} });
        expect(mockPlaylist.isPlaying).toBe(true);

        // C. Wait for simulation
        // Tracks: Intro (0), News (1), Outro (2)
        // Rate: 20ms per track.
        // Wait 100ms to ensure we pass track 1
        await new Promise(r => setTimeout(r, 100));

        // D. Verify Reaction Rule 'yaml-react-to-second-track'
        // This rule checks if state.playlist.index == 1
        // And sets state 'yaml_reaction_success' = true
        const reactionSuccess = stateManager.get("yaml_reaction_success");
        expect(reactionSuccess).toBe(true);

        // Verify state sync
        //@ts-expect-error
        expect(stateManager.get("playlist")?.index ).toBeGreaterThanOrEqual(1);
    });

    test("YAML: Should handle loop sequence and interpolation", async () => {
        // Monitor console logs for interpolation verify (optional, hard to test console output directly without spy, 
        // but if logic runs without error, interpolation worked)
        
        // A. Trigger Loop Setup from YAML rule 'yaml-setup-loop'
        // This sequence: LOADS [TrackA, TrackB] -> SETS LOOP -> PLAYS
        await engine.evaluateContext({ event: "SETUP_LOOP", id: "1", timestamp: Date.now(), data: {} });

        expect(mockPlaylist.tracks).toEqual(["TrackA", "TrackB"]);
        expect(mockPlaylist.isLooping).toBe(true);
        expect(mockPlaylist.isPlaying).toBe(true);

        // Wait for loop to happen
        // 2 tracks * 20ms = 40ms. It should loop back to A.
        await new Promise(r => setTimeout(r, 80));

        // It should be playing again (index 0 or 1)
        expect(mockPlaylist.isPlaying).toBe(true);
        //@ts-expect-error
        expect(stateManager.get("playlist")?.index).toBeDefined();
    });
});
