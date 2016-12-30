import React from "react";
import _ from "lodash";
import MIDIListener from "../../utils/midi-listener";

class MIDIOutputSelector extends React.Component {
	state = {
		midiOutputs: []
	}

	static propTypes = {
		onOutputChanged: React.PropTypes.func,
		nullOutputText: React.PropTypes.string
	}

	static defaultProps = {
		nullOutputText: "(None)"
	}

	setOutputList(listener) {
		this.setState({midiOutputs: [undefined].concat(Array.from(listener.outputs))});
	}

	componentDidMount() {
		this.midiListenerPromise.done(
			listener => {
				this.setOutputList(listener);

				listener.on('device-connected', () => this.setOutputList(listener));
				listener.on('device-disconnected', (device) => {
					if (device.id === this.select.value) {
						this.select.selectedIndex = 0;
						this.handleSelectionChange(null);
					}

					this.setOutputList(listener);
				});
			}
		)
	}

	midiListenerPromise = MIDIListener.create()

	handleSelectionChange(selectedId) {
		if (_.isFunction(this.props.onOutputChanged)) {
			// Change empty string to null
			this.props.onOutputChanged(selectedId || null);
		}
	}

	render() {
		return (
			<select
				className={["midi-output-selector-control", "form-control"].concat(this.props.className || []).join(' ')}
				onChange={(event) => this.handleSelectionChange(event.target.value)}
				ref={(node) => { this.select = node; }}
			>
				{
					this.state.midiOutputs.length &&
					this.state.midiOutputs.map(
						output => (
							<option
								key={output ? output.id : this.props.nullOutputText}
								value={output ? output.id : ''}
							>
								{output ? output.name : this.props.nullOutputText}
							</option>
						)
					)
				}
			</select>
		);
	}
}

export default MIDIOutputSelector;
