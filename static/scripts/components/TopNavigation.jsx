import React from "react";
import _ from "lodash";

class TopNavigation extends React.Component {
	render() {
		const user = null;

		let userLinkElements;

		if (user) {
			userLinkElements = [
				<span key={_.uniqueId()}>Logged in as </span>,
				<a href="/profile/" key={_.uniqueId()}></a>
			];
		}
		else {
			userLinkElements = [
				<a href="/login" key={_.uniqueId()}>Log in</a>
			];
		}

		return (
			<nav className="top-nav navbar navbar-default">
				<div className="container-fluid">
					<div className="navbar-header">
						<a href="/" className="navbar-brand brand">WebKB</a>
					</div>
					<ul className="nav navbar-nav">
						<li>
							<a href="/keyboard">
								Keyboard
							</a>
						</li>
						<li>
							<a href="/play-file">
								File Player
							</a>
						</li>
						<li>
							<a href="/timeline">
								Timeline
							</a>
						</li>
					</ul>
					<p className="navbar-text navbar-right">
						{userLinkElements}
					</p>
				</div>
			</nav>
		);
	}
}

export default TopNavigation;
