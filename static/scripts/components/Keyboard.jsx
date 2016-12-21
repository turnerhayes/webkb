import React from "react";
import _ from "lodash";
import "keyboard.scss";

class Keyboard extends React.Component {
	render() {
		return (
			<section className="keyboard__container">
				<ol className="keyboard__keys">
					{_.map(
						_.range(10),
						(num) => (
							<li className="keyboard__key" key={num}>{num}</li>
						)
					)}
				</ol>
			</section>
		);
	}
}

export default Keyboard;
