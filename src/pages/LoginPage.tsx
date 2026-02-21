import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, EyeOff, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email first to reset password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setInfo('Password reset email sent. Check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-none sm:rounded-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0">
        <div className="relative h-64 shrink-0">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDB_k0QfdPeCMxSUVCbJPLQFHL2Z1yD2lPjpRYbDJIPC_-oAmb8iT1uRM_H67jQ2xVimtYCv0Oe7uq1igaNJZXy3Zg9CrcMW46t3Mbij1CdLS8OEARbZ28lpvG2XU974Jv_W-f5_g5QegvaxRQGvJeiLhE-0BQxN9hdLdoYfb-XR05Y-y7Z7Ci2jqaiIrqqYbRq1wR-I4T3fDky7arbKEQS-DFe1n_gLczCcqQzqQyu41opMZrlMgHcPK2nB733De4lFvevjcic4n4"
            alt="Dogs"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <h1 className="text-white text-3xl font-bold">Cartilla Veterinaria</h1>
            <p className="text-white/90 text-sm">Welcome back, paw parent!</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100">
              {info}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-primary"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-lg font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or continue with</span></div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
