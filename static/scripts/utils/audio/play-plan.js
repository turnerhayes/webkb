import EventEmitter from "events";
import Q from "q";
import assert from "assert";
import MIDIEvent from "../../utils/midi-file-parser/midi-file/event";
import audioContext from "./context";

class PlayPlan extends EventEmitter {
	notes = []

	addNote(note) {
		assert(note.buffer, "'buffer' is required");
		assert('startAt' in note, "'startAt' is required");
		assert('duration' in note, "'duration' is required");
		this.notes.push(note);
	}

	run() {
		const endedPromises = [];

		this.notes.forEach(
			note => {	
				const source = audioContext.createBufferSource();

				source.buffer = note.buffer;

				let connectingNode = source;

				if ('volume' in note && note.volume !== 1) {
					const gainNode = audioContext.createGain();

					gainNode.gain.value = note.volume;

					source.connect(gainNode);

					connectingNode = gainNode;
				}

				endedPromises.push(Q.Promise(
					resolve => source.onended = () => resolve()
				));

				connectingNode.connect(audioContext.destination);

				const currentTime = audioContext.currentTime;

				source.start(currentTime + note.startAt);

				source.stop(currentTime + note.startAt + note.duration);
			}
		);

		return Q.all(endedPromises);
	}
}

export default PlayPlan;
