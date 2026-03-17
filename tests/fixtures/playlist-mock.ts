/**
 * Shared MockPlaylistManager for playlist tests
 * This avoids code duplication across playlist_integration.test.ts and playlist_yaml.test.ts
 */

import { EventEmitter } from "events";
import { StateManager } from "../../src/core/state-manager";

export class MockPlaylistManager extends EventEmitter {
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
        // Faster simulation for testing (can be overridden)
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

    // Allow custom playback speed for different test scenarios
    setPlaybackSpeed(ms: number) {
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = setTimeout(() => this.finishTrack(), ms);
        }
    }
}
