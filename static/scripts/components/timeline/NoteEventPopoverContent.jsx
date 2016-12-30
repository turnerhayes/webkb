import React from "react";

function toDurationString(microseconds) {
	let str = '';

	let seconds = (microseconds / 1000000);

	let minutes = 0;

	if (seconds >= 60) {
		minutes = Math.floor(seconds / 60);
		seconds = seconds % 60;
	}

	if (minutes > 0) {
		str += minutes + 'm ';
	}

	str += seconds.toFixed(2) + 's';

	return str;
}

class NoteEventPopoverContent extends React.Component {
	render() {
		return (
			<dl>
				<dt>Start</dt>
				<dd>{toDurationString(this.props.start)}</dd>

				<dt>Duration</dt>
				<dd>{toDurationString(this.props.duration / 1000000)}</dd>

				<dt>Velocity</dt>
				<dd>{Math.round((this.props.velocity * 100) / 127)}%</dd>
			</dl>
		);
	}
}

export default NoteEventPopoverContent;
