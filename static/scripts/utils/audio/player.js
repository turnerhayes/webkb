import Promise from "bluebird";
import audioContext from "./context";

class AudioPlayer {
	connectedSources = []

	decodeFile(file) {
		return audioContext.decodeAudioData(file);
	}

	playBuffer(buffer, options = {}) {
		const source = audioContext.createBufferSource();

		source.buffer = buffer;
		source.loop = options.loop;

		source.connect(audioContext.destination);

		this.connectedSources.push(source);

		source.start(0);

		return {
			stop(when) {
				source.stop(_.isUndefined(when) ? audioContext.currentTime : when);
			},

			get loop() {
				return source.loop;
			},

			set loop(val) {
				source.loop = !!val;
			}
		};
	}

	stopAll() {
		for (var i = this.connectedSources.length - 1; i >= 0; i--) {
			this.connectedSources[i].stop();
			this.connectedSources[i].disconnect();
			this.connectedSources.pop();
		}
	}

	pause() {
		return Promise.resolve(
			audioContext.state === 'running' ?
				audioContext.suspend() :
				undefined
		);
	}

	get isPaused() {
		return audioContext.state === 'suspended';
	}

	resume() {
		return Promise.resolve(
			audioContext.state === 'suspended' ?
				audioContext.resume() :
				undefined
		);
	}
}

export default AudioPlayer;
