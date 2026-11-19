import { Blocks } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export default function AuthLayout({ children, register = false }) {
  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <div className="brand"><span className="brand-mark">{'</>'}</span> KidCode <span className="brand-location">Neiva</span></div>
        <div className="visual-copy">
          <div className="visual-art"><Blocks aria-hidden="true" /></div>
          <h1>Aprender a programar puede ser una aventura.</h1>
          <p>Explora retos, descubre patrones y crea soluciones mientras juegas. Cada misión te acerca a una nueva idea.</p>
        </div>
        <div className="visual-footer">Una experiencia educativa alineada con el ODS 4 · Educación de calidad</div>
      </section>
      <section className="auth-main">
        <ThemeToggle className="auth-theme-toggle" />
        <div className="auth-card">{register ? <div className="eyebrow">Únete a la aventura</div> : <div className="eyebrow">Bienvenido de vuelta</div>}{children}</div>
      </section>
    </main>
  );
}
