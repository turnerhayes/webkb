import React from "react";
import TopNavigation from "./TopNavigation";
import "bootstrap/dist/js/bootstrap.js";
import "bootstrap/dist/css/bootstrap.css";

import "page-layout.less";

class App extends React.Component {
	render() {
		return (
			<section className="page-layout__main-container">
				<header className="page-layout__main-header">
					{
						this.props.noTopNav ?
						'' :
						<TopNavigation />
					}
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
