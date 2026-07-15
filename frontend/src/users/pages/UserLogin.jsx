import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Lock, EyeOff, Eye, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { loginUser } from '../../redux/api/userApi';
import { useDispatch } from 'react-redux';
import { setUserInfo } from '../../redux/slices/authSlice';
import { useGoogleLogin } from '@react-oauth/google';
import { checkEmailApi, resetPasswordApi, responseGoogleApi, sendOtpApi, verifyOtpApi } from '../../services/api/userApis/userAuthApi';
import { useUserAuthNavigation } from '../../hooks/useAuthNavigation';
import { setAuthToken } from '../../services/api/api';

export default function SignIn() {
  const dispatch = useDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPasswordModalOpen, setNewPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const responseGoogle = async (authResult) => {
    try {
      if (authResult.code) {
        const result = await responseGoogleApi({
          code: authResult.code
        });

        console.log("Authentication result:", result);

        if (result.data.token) {
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('jwt', result.data.token);
          localStorage.setItem('userInfo', JSON.stringify(result.data.user));
          setAuthToken(result.data.token); // immediately update axios header
          dispatch(setUserInfo(result.data.user));

          toast.success('Successfully signed in with Google!');
          navigate('/');
        }
      }
    } catch (error) {
      console.error("Error during Google login:", error.response?.data || error.message);
      toast.error('Google login failed: ' + error.response?.data?.message || error.message);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: responseGoogle,
    flow: 'auth-code'
  });

  const { navigate } = useUserAuthNavigation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const data = await loginUser(email, password);
      console.log('Login Data:', data);

      if (data) {
        dispatch(setUserInfo(data));
        localStorage.setItem('userInfo', JSON.stringify(data));
        if (data.token) {
          localStorage.setItem('jwt', data.token);
          setAuthToken(data.token); // immediately update axios header
        }

        toast.success('Successfully signed in!');
        navigate('/');
      } else {
        throw new Error('Login failed: No data received');
      }
    } catch (error) {
      toast.error('Login failed: ' + error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setIsResetting(true);
      const checkEmailResponse = await checkEmailApi(resetEmail)

      if (!checkEmailResponse.data.exists) {
        toast.error('Email not found in our records');
        return;
      }

      const response = await sendOtpApi(resetEmail)
      toast.success('OTP sent to your email!');
      setIsModalOpen(false);
      setOtpModalOpen(true);
    } catch (error) {
      toast.error('Failed to send OTP: ' + error.response?.data?.message || error.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    console.log('called verify frontend');

    e.preventDefault();
    try {
      const response = await verifyOtpApi({
        email: resetEmail,
        otp: otp
      });

      if (response.data.success) {
        toast.success('OTP verified successfully!');
        setOtpModalOpen(false);
        setNewPasswordModalOpen(true);
      }
    } catch (error) {
      toast.error('Invalid OTP');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await resetPasswordApi({
        email: resetEmail,
        password: newPassword
      });

      toast.success('Password reset successfully!');
      setNewPasswordModalOpen(false);
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const token = localStorage.getItem('jwt');
  const userInfo = localStorage.getItem('userInfo');

  useEffect(() => {
    if (token && userInfo) {
      navigate('/');
    }
  }, [token, userInfo, navigate]);

  if (token && userInfo) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative p-4 select-none"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80')` }}
    >
      {/* Dark overlay with ambient blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-0" />

      {/* Back button top left */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-white/90 hover:text-white transition-all bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg border border-white/10 backdrop-blur-md shadow-sm"
        >
          <span className="mr-1">&larr;</span> Back to store
        </Link>
      </div>

      {/* Centered Floating Card */}
      <div className="relative z-10 w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 animate-scale-in">
        {/* Brand logo & header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-2xl font-black tracking-tighter text-black no-underline mb-1 inline-block hover:opacity-90 transition-opacity"
          >
            VINT<span className="text-[#e11d48]">AGE</span>
          </Link>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Please enter your details to sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
            <input
              id="email"
              type="email"
              placeholder="Email Address"
              className="pl-10 pr-4 h-11 w-full bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="pl-10 pr-10 h-11 w-full bg-gray-55/30 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-gray-500 hover:text-black transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors duration-200 rounded-lg flex items-center justify-center gap-1.5"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">or continue with</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-1">
          <Button
            variant="outline"
            className="w-full h-11 border-gray-200 hover:bg-gray-50 hover:text-black font-semibold text-gray-700 transition-colors flex items-center justify-center gap-2 rounded-lg"
            onClick={googleLogin}
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_17_40)">
                <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4" />
                <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853" />
                <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04" />
                <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335" />
              </g>
              <defs>
                <clipPath id="clip0_17_40">
                  <rect width="48" height="48" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <span>Sign in with Google</span>
          </Button>
        </div>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-500 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-black hover:underline ml-0.5">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 w-full max-w-sm animate-scale-in">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <KeyRound className="h-5 w-5 text-gray-700" />
                Reset Password
              </h2>
              <p className="text-xs text-gray-500 mt-1">Enter your email address to receive a validation OTP</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="Email Address"
                  className="pl-10 pr-4 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors text-xs"
                  disabled={isResetting}
                >
                  {isResetting ? 'Sending...' : 'Send OTP'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 border-gray-200 hover:bg-gray-50 font-bold text-gray-700 rounded-lg text-xs"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 w-full max-w-sm animate-scale-in">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-gray-700" />
                Enter OTP
              </h2>
              <p className="text-xs text-gray-500 mt-1">Please enter the security OTP sent to your email</p>
            </div>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                id="otp"
                type="text"
                placeholder="OTP Code"
                className="h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-center tracking-widest text-lg font-bold"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <div className="flex gap-2.5 pt-2">
                <Button type="submit" className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs">
                  Verify OTP
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 border-gray-200 hover:bg-gray-50 font-bold text-gray-700 rounded-lg text-xs"
                  onClick={() => setOtpModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Password Modal */}
      {newPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 w-full max-w-sm animate-scale-in">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Define New Password</h2>
              <p className="text-xs text-gray-500 mt-1">Create a new secure password for your account</p>
            </div>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <input
                id="new-password"
                type="password"
                placeholder="New Password"
                className="h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm pl-4"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirm Password"
                className="h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm pl-4"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="flex gap-2.5 pt-2">
                <Button type="submit" className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs">
                  Save Password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 border-gray-200 hover:bg-gray-50 font-bold text-gray-700 rounded-lg text-xs"
                  onClick={() => setNewPasswordModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}