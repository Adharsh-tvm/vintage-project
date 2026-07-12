import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { setAdminInfo } from '../../redux/slices/adminSlice';
import { loginAdmin } from '../../redux/api/adminApi';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const admin = useSelector(state => state.admin.data);

    // Check if already logged in
    useEffect(() => {
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo && admin) {
            navigate('/admin');
        }
    }, [admin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const data = await loginAdmin(email, password);
            console.log('Login Data:', data);

            if (data) {
                // Store admin info in Redux
                dispatch(setAdminInfo(data));
                
                // Store admin info in localStorage
                localStorage.setItem('adminInfo', JSON.stringify(data));
                
                // Store token in localStorage
                if (data.token) {
                    localStorage.setItem('jwt', data.token);
                }

                toast.success('Successfully signed in!');
                navigate('/admin');
            } else {
                throw new Error('Login failed: No data received');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Login failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative p-4 select-none animate-fade-in"
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
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white tracking-wider uppercase">
                            Admin Portal
                        </span>
                    </div>
                    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight mt-4">
                        Welcome back
                    </h1>
                
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            id="email"
                            type="email"
                            placeholder="Email Address"
                            className="pl-10 pr-4 h-11 w-full bg-gray-55/30 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                            disabled={isLoading}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            </div>
        </div>
    );
}