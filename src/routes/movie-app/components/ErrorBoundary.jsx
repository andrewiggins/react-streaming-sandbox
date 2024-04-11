import { Component } from "react";

/**
 * @typedef {{ children: React.ReactNode; FallbackComponent: React.FC<{ error: Error }> }} Props
 * @extends {React.Component<Props>} */
export default class ErrorBoundary extends Component {
	/** @param {Props} props */
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	/** @param {Error} error */
	static getDerivedStateFromError(error) {
		return { error };
	}
	render() {
		if (this.state.error) {
			const FallbackComponent = this.props.FallbackComponent;
			return <FallbackComponent error={this.state.error} />;
		}
		return this.props.children;
	}
}
