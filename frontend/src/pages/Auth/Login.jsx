import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  Shield,
  Loader2,
  UtensilsCrossed,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Owner', email: 'owner@habesha.com', hint: 'All branches access', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { role: 'Manager', email: 'manager.bole@habesha.com', hint: 'Bole branch', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { role: 'Cashier', email: 'cashier.bole@habesha.com', hint: 'Bole branch', color: 'bg-green-100 text-green-700 border-green-200' },
  { role: 'Waiter', email: 'waiter.bole@habesha.com', hint: 'Bole branch', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { role: 'Chef', email: 'kitchen.bole@habesha.com', hint: 'Kitchen display', color: 'bg-red-100 text-red-700 border-red-200' },
];
const DEMO_PASSWORD = 'Password123!';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuthStore();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (loginError) setLoginError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoginError('');
    const result = await login(formData);

    if (!result?.success) {
      const msg = result?.message || 'Invalid email or password';
      if (msg.toLowerCase().includes('disabled') || msg.toLowerCase().includes('deactivated')) {
        setLoginError('Your account has been deactivated. Please contact your manager.');
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setLoginError('Invalid email or password. Please try again.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('connection')) {
        setLoginError('Unable to connect to server. Please check your connection.');
      } else {
        setLoginError(msg);
      }
      toast.error(msg);
    }
  };

  const handleDemoLogin = async (email) => {
    setLoginError('');
    const result = await login({ email, password: DEMO_PASSWORD });
    if (!result?.success) {
      const msg = result?.message || 'Demo login failed';
      setLoginError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      {/* Back to Home */}
      <div className="p-4">
        <Link
          to="/customer"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg shadow-cyan-500/25 mb-4">
              <UtensilsCrossed className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasty Station POS</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Restaurant Management System</p>
          </div>

          {/* Login Card */}
          <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Welcome back
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {loginError && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertCircle className="size-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{loginError}</p>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@habesha.com"
                      className={`pl-10 h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${
                        errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
                      }`}
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className={`pl-10 pr-10 h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${
                        errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
                      }`}
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.password}
                    </p>
                  )}
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-lg shadow-cyan-600/25"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="size-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </CardContent>
            </form>

            {/* Demo Login Section */}
            <CardFooter className="flex-col pt-0">
              <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
                    Demo Access
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                    Test accounts for demonstration purposes only
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <Button
                      key={acc.role}
                      type="button"
                      variant="outline"
                      disabled={isLoggingIn}
                      onClick={() => handleDemoLogin(acc.email)}
                      className={`h-11 justify-between border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 ${acc.color}`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="size-4" />
                        <span className="font-semibold">{acc.role}</span>
                      </span>
                      <span className="text-xs opacity-80">{acc.hint}</span>
                    </Button>
                  ))}
                </div>

                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3">
                  All demo accounts use password: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{DEMO_PASSWORD}</code>
                </p>
              </div>

              {/* Security Note */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 w-full">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Shield className="size-3.5" />
                  <span>Secured with SSL encryption</span>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            © {new Date().getFullYear()} Tasty Station. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
