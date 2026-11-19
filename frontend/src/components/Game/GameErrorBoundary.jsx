import { Component } from 'react';

export default class GameErrorBoundary extends Component {
  state = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error de renderizado en el juego:', error, info.componentStack);
  }

  reset = () => {
    this.setState((state) => ({ hasError: false, resetKey: state.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return <main className="game-recovery-screen" role="alert">
        <div className="game-recovery-card">
          <span aria-hidden="true">🛠️</span>
          <h1>El tablero tuvo un problema</h1>
          <p>Tu progreso guardado está a salvo. Puedes volver a cargar el juego o regresar a tus misiones.</p>
          <div className="game-guide-actions">
            <button type="button" className="secondary-btn" onClick={this.props.onBack}>Volver a mis juegos</button>
            <button type="button" className="primary-btn" onClick={this.reset}>Cargar de nuevo</button>
          </div>
        </div>
      </main>;
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
