import { useState, useEffect } from "react";
import { toast } from "sonner";
import { resendOtpApi } from "../../services/api/userApis/userAuthApi";
import { ShieldCheck } from "lucide-react";

const OtpModal = ({ formData, showOtpModal, setShowOtpModal, verifyOtpAndSignup }) => {
    const [otp, setOtp] = useState("");
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval;
        if (showOtpModal && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev === 1) {
                        setCanResend(true);
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [showOtpModal, timer]);

    const handleResendOtp = async () => {
        try {
            const response = await resendOtpApi({
                email: formData.email.toLowerCase()
            });

            if (response.data) {
                toast.success("OTP resent successfully!");
                setTimer(60);
                setCanResend(false);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error resending OTP";
            toast.error(errorMessage);
        }
    };

    if (!showOtpModal) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 w-full max-w-sm animate-scale-in">
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-5 w-5 text-gray-700" />
                        Enter OTP
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Please enter the 6-digit OTP code sent to <span className="font-semibold text-gray-700">{formData?.email}</span>
                    </p>
                </div>
                <input
                    type="text"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mb-4 h-11 bg-gray-55/30 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all rounded-lg text-center tracking-[0.2em] text-lg font-bold w-full outline-none"
                />
                <div className="text-xs text-gray-500 mb-4 text-center">
                    {timer > 0 ? (
                        <p>Resend OTP in <span className="font-bold text-gray-700">{timer}s</span></p>
                    ) : (
                        <button
                            onClick={handleResendOtp}
                            className="text-black font-bold hover:underline transition-all"
                            disabled={!canResend}
                        >
                            Resend OTP
                        </button>
                    )}
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={() => verifyOtpAndSignup(otp)}
                        className="flex-1 bg-primary text-primary-foreground p-2.5 text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Verify OTP
                    </button>
                    <button
                        onClick={() => setShowOtpModal(false)}
                        className="flex-1 border border-gray-200 p-2.5 text-xs font-bold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OtpModal;
