import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

// ── Captcha: preguntas de cultura general / gramática argentina ──────────────
const CAPTCHA_QUESTIONS = [
  { question: '¿Quién escribió "Martín Fierro"?', correct: 'José Hernández', options: ['José Hernández', 'Jorge Luis Borges', 'Julio Cortázar'] },
  { question: '¿Cuál es la capital de la Provincia de Buenos Aires?', correct: 'La Plata', options: ['La Plata', 'Buenos Aires', 'Mar del Plata'] },
  { question: '¿Quién escribió "Don Quijote de la Mancha"?', correct: 'Cervantes', options: ['Cervantes', 'Shakespeare', 'Borges'] },
  { question: '¿Cuántas vocales tiene el abecedario español?', correct: '5', options: ['5', '7', '3'] },
  { question: '¿Cómo se llama la montaña más alta de América?', correct: 'Aconcagua', options: ['Aconcagua', 'Everest', 'Kilimanjaro'] },
  { question: '¿Cuál es el sujeto en "El perro ladra fuerte"?', correct: 'El perro', options: ['El perro', 'Ladra', 'Fuerte'] },
  { question: '¿Qué color tiene el caballo blanco de San Martín?', correct: 'Blanco', options: ['Blanco', 'Negro', 'Marrón'] },
  { question: 'En "María canta bien", ¿cuál es el verbo?', correct: 'Canta', options: ['Canta', 'María', 'Bien'] },
  { question: '¿Cuál es la capital de Argentina?', correct: 'Buenos Aires', options: ['Buenos Aires', 'Córdoba', 'Rosario'] },
  { question: '¿Cuántas letras tiene la palabra "casa"?', correct: '4', options: ['4', '5', '3'] },
  { question: 'En "Los niños juegan", ¿cuál es el sujeto?', correct: 'Los niños', options: ['Los niños', 'Juegan', 'Los'] },
  { question: '¿Qué animal hace "miau"?', correct: 'Gato', options: ['Gato', 'Perro', 'Vaca'] },
];

function pickCaptcha() {
  const q = CAPTCHA_QUESTIONS[Math.floor(Math.random() * CAPTCHA_QUESTIONS.length)];
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);
  return { question: q.question, correct: q.correct, options: shuffled };
}

// ── Partículas canvas ─────────────────────────────────────────────────────────
function useParticles(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const mouse = { x: null as number | null, y: null as number | null, radius: 150 };

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();

    class Particle {
      x: number; y: number; baseX: number; baseY: number;
      size: number; density: number; speedX: number; speedY: number;
      constructor(x: number, y: number) {
        this.x = this.baseX = x;
        this.y = this.baseY = y;
        this.size = Math.random() * 3 + 1;
        this.density = Math.random() * 30 + 5;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
      }
      draw() {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > c.width) this.speedX *= -1;
        if (this.y < 0 || this.y > c.height) this.speedY *= -1;
        if (mouse.x != null && mouse.y != null) {
          const dx = mouse.x - this.x, dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * this.density;
            this.y -= (dy / dist) * force * this.density;
          }
        }
        this.x += (this.baseX - this.x) * 0.05;
        this.y += (this.baseY - this.y) * 0.05;
      }
    }

    let particles: Particle[] = [];
    const init = () => {
      particles = [];
      const n = (c.width * c.height) / 6000;
      for (let i = 0; i < n; i++)
        particles.push(new Particle(Math.random() * c.width, Math.random() * c.height));
    };

    const connect = () => {
      for (let a = 0; a < particles.length; a++)
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x, dy = particles[a].y - particles[b].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 100) * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
    };

    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      particles.forEach(p => { p.update(); p.draw(); });
      connect();
      raf = requestAnimationFrame(animate);
    };

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = null; mouse.y = null; };
    const onResize = () => { resize(); init(); };

    c.addEventListener('mousemove', onMove);
    c.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener('mousemove', onMove);
      c.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef]);
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState(pickCaptcha);
  const [captchaValue, setCaptchaValue] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { login } = useAuthStore();

  useParticles(canvasRef);

  // Ping al backend al cargar el login para reducir el cold start de Render
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${base}/health`).catch(() => {});
  }, []);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(pickCaptcha());
    setCaptchaValue('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaValue !== captcha.correct) {
      setError('Respuesta incorrecta. Intentá de nuevo.');
      refreshCaptcha();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (!rememberMe) {
        // Si no quiere mantener sesión, limpiamos el persist al cerrar la ventana
        const clearOnClose = () => {
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('token');
        };
        window.addEventListener('beforeunload', clearOnClose, { once: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email o contraseña incorrectos');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a73e8 0%, #34a853 100%)',
      overflow: 'hidden',
    }}>
      {/* Canvas partículas */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 1, pointerEvents: 'all',
      }} />

      {/* Card de login */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 420, padding: 20,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 20,
          padding: '48px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.3)',
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(30px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .login-input {
              width: 100%; padding: 12px 16px; box-sizing: border-box;
              border: 2px solid #dadce0; border-radius: 8px;
              font-size: 14px; font-family: inherit;
              transition: border-color 0.3s, box-shadow 0.3s;
              outline: none; background: white;
            }
            .login-input:focus {
              border-color: #1a73e8;
              box-shadow: 0 0 0 3px rgba(26,115,232,0.15);
            }
            .login-btn {
              width: 100%; padding: 14px;
              background: linear-gradient(135deg, #1a73e8, #34a853);
              color: white; border: none; border-radius: 8px;
              font-size: 15px; font-weight: 600; font-family: inherit;
              cursor: pointer; transition: opacity 0.2s, transform 0.1s;
              margin-top: 8px;
            }
            .login-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
            .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          `}</style>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1a73e8', fontFamily: 'inherit' }}>
              SIGAM
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#5f6368', fontFamily: 'inherit' }}>
              Sistema Integral de Gestión Alimentaria Municipal
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fce8e6', color: '#c5221f',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, marginBottom: 16, fontFamily: 'inherit',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#202124', fontFamily: 'inherit' }}>
                Email:
              </label>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#202124', fontFamily: 'inherit' }}>
                Contraseña:
              </label>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Captcha */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#202124', fontFamily: 'inherit' }}>
                Verificación:{' '}
                <span style={{ color: '#1a73e8', fontWeight: 600 }}>{captcha.question}</span>
              </label>
              <select
                className="login-input"
                value={captchaValue}
                onChange={e => setCaptchaValue(e.target.value)}
                required
              >
                <option value="">-- Seleccioná una respuesta --</option>
                {captcha.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Mantener sesión */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', marginBottom: 20,
              background: 'rgba(26,115,232,0.05)',
              borderRadius: 8, border: '1px solid rgba(26,115,232,0.15)',
            }}>
              <label htmlFor="rememberMe" style={{
                fontSize: 14, color: '#5f6368', cursor: 'pointer',
                fontFamily: 'inherit', margin: 0,
              }}>
                🔐 Mantener sesión iniciada
              </label>
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#1a73e8' }}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 0, fontSize: 11, color: '#9aa0a6', fontFamily: 'inherit' }}>
            Secretaría de Desarrollo Social · Municipalidad de La Plata
          </p>
        </div>
      </div>
    </div>
  );
}
