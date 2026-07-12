import React, { useCallback, useState } from 'react'
import { ArrowRight, Mail, Lock, User, EyeOff, Eye } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Link, useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { setUserInfo } from '../../redux/slices/authSlice';
import OtpModal from './otpModal';
import { useGoogleLogin } from '@react-oauth/google';
import { userSignupApi, userSignupOtpApi, userVerifyOtpApi, responseGoogleApi } from '../../services/api/userApis/userAuthApi';

function UserSignUp() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        referralCode: ""
    });
    const [error, setError] = useState("");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [isOtpVerified, setIsOtpVerified] = useState(false);

    const [otpSent, setOtpSent] = useState(false);
    const [message, setMessage] = useState("");
    const [timer, setTimer] = useState(60);
    const [email, setEmail] = useState(formData.email)

    const [isLoading, setIsLoading] = useState(false);

    const token = localStorage.getItem('jwt');
    const userInfo = localStorage.getItem('userInfo');

    React.useEffect(() => {
        if (token && userInfo) {
            navigate('/');
        }
    }, [token, userInfo, navigate]);

    if (token && userInfo) {
        return null;
    }

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
                    dispatch(setUserInfo(result.data.user));

                    toast.success('Successfully signed up with Google!');
                    navigate('/');
                }
            }
        } catch (error) {
            console.error("Error during Google signup:", error.response?.data || error.message);
            toast.error('Google signup failed: ' + error.response?.data?.message || error.message);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: responseGoogle,
        onError: responseGoogle,
        flow: 'auth-code'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return (
            password.length >= minLength &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSpecialChar
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Start loading
        const { firstName, lastName, email, password, confirmPassword } = formData;

        if (!firstName?.trim() || !lastName?.trim()) {
            setIsLoading(false);
            toast.error("First name and last name cannot be empty");
            return;
        }

        if (firstName.trim().length < 2) {
            setIsLoading(false);
            toast.error("First name must be at least 2 characters long");
            return;
        }

        if (lastName.trim().length < 1) {
            setIsLoading(false);
            toast.error("Last name must be at least 1 character long");
            return;
        }

        if (!validateEmail(email)) {
            setIsLoading(false);
            toast.error("Please enter a valid email address");
            return;
        }

        if (!validatePassword(password)) {
            setIsLoading(false);
            toast.error(
                "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters"
            );
            return;
        }

        if (password !== confirmPassword) {
            setIsLoading(false);
            toast.error("Passwords do not match");
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const otpResponse = await userSignupOtpApi({
                email: email.toLowerCase()
            });

            if (otpResponse.data) {
                toast.success("OTP sent to your email!");
                setShowOtpModal(true);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error sending OTP";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false); // Stop loading
        }
    };

    const verifyOtpAndSignup = async (otp) => {
        try {
            const verifyResponse = await userVerifyOtpApi({
                email: formData.email.toLowerCase(),
                otp,
            });

            if (verifyResponse.data.success) {
                const signupData = {
                    firstname: formData.firstName.trim(),
                    lastname: formData.lastName.trim(),
                    email: formData.email.toLowerCase(),
                    password: formData.password,
                    referralCode: formData.referralCode
                };

                const response = await userSignupApi(signupData)

                if (response.data) {
                    const userData = {
                        name: `${response.data.firstname} ${response.data.lastname}`,
                        email: response.data.email,
                    };

                    dispatch(setUserInfo(userData));
                    localStorage.setItem('userInfo', JSON.stringify(userData));
                    toast.success("Signup successful!");

                    setTimeout(() => {
                        navigate('/');
                    }, 1500);
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Invalid OTP";
            setOtpError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const startTimer = () => {
        setTimer(60);
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev === 1) clearInterval(interval);
                return prev - 1;
            });
        }, 1000);
    };

    const handleOtp = useCallback(() => {
        console.log();
    })

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
            <div className="relative z-10 w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 animate-scale-in my-8 sm:my-0">
                {/* Brand logo & header */}
                <div className="text-center mb-8">
                    <Link
                        to="/"
                        className="text-2xl font-black tracking-tighter text-black no-underline mb-1 inline-block hover:opacity-90 transition-opacity"
                    >
                        VINT<span className="text-[#e11d48]">AGE</span>
                    </Link>
                    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                        Create an Account
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Sign up to get started with our platform
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* First & Last Name row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                placeholder="First Name"
                                className="pl-10 pr-4 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                            <input
                                id="lastName"
                                name="lastName"
                                type="text"
                                placeholder="Last Name"
                                className="pl-10 pr-4 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Email Address"
                            className="pl-10 pr-4 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            className="pl-10 pr-10 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                            value={formData.password}
                            onChange={handleChange}
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

                    {/* Confirm Password */}
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirm Password"
                            className="pl-10 pr-10 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                            value={formData.confirmPassword}
                            onChange={handleChange}
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

                    {/* Referral Code (Optional) */}
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            id="referralCode"
                            name="referralCode"
                            type="text"
                            placeholder="Referral Code (Optional)"
                            className="pl-10 pr-4 h-11 w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:outline-none transition-all rounded-lg text-sm"
                            value={formData.referralCode}
                            onChange={handleChange}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors duration-200 rounded-lg flex items-center justify-center gap-1.5 mt-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <span>Create Account</span>
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
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
                        <span>Sign up with Google</span>
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <p className="text-gray-500 font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold text-black hover:underline ml-0.5">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            <OtpModal
                formData={formData}
                showOtpModal={showOtpModal}
                setShowOtpModal={setShowOtpModal}
                verifyOtpAndSignup={verifyOtpAndSignup}
            />
        </div>
    )
}

export default UserSignUp