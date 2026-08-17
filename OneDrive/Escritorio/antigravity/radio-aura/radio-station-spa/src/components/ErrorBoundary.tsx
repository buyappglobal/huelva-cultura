import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../lib/errorReporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Red de seguridad de última línea: si cualquier componente revienta al
 * renderizar, en vez del pantallazo blanco mostramos una pantalla amable
 * con opción de refrescar, y avisamos al equipo por detrás. Es un class
 * component a propósito: solo los class components pueden ser Error
 * Boundaries en React.
 *
 * Los estilos van en línea a propósito: así la pantalla de recuperación se
 * ve aunque el fallo tenga que ver con los estilos de la app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error, 'render', { componentStack: info?.componentStack || undefined });
  }

  handleReload = () => {
    // Recarga limpia intentando además saltarse la caché.
    try {
      window.location.reload();
    } catch {
      window.location.href = window.location.href;
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '24px', background: 'radial-gradient(circle at 50% 30%, #14121f, #050505)',
        color: '#fff', fontFamily: 'Helvetica, Arial, sans-serif',
      }}>
        <div style={{ fontSize: '52px', marginBottom: '8px' }}>🎧</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px' }}>
          Algo se ha atascado un momento
        </h1>
        <p style={{ fontSize: '15px', color: '#a9a9b8', maxWidth: '420px', lineHeight: 1.5, margin: '0 0 24px' }}>
          Perdona el corte. Hemos avisado al equipo automáticamente y ya lo estamos mirando.
          Prueba a refrescar la página: casi siempre se soluciona al instante.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: 'linear-gradient(90deg, #7c3aed, #a855f7)', color: '#fff',
            border: 'none', borderRadius: '14px', padding: '13px 30px',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(124,58,237,0.35)',
          }}
        >
          Refrescar la página
        </button>
        <p style={{ fontSize: '12px', color: '#555', marginTop: '28px' }}>
          Aura Radio · Si el problema sigue, vuelve a intentarlo en unos minutos.
        </p>
      </div>
    );
  }
}
