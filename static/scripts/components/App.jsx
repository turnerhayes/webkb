import React from "react";

class App extends React.Component {
	render() {
		return (
			<section className="page-layout__main-container">
				<header className="page-layout__main-header">
					<h1>{this.props.pageHeader}</h1>
				</header>
				<article className="page-layout__main-content">
					{this.props.children}
				</article>
			</section>
		);
	}
}

export default App;
