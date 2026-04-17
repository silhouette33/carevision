import { useState } from 'react';
import { api } from '../api/client';

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'register') {
                await api.register(form);
                setMode('login');
                setError('회원가입 완료! 로그인해주세요.');
            } else {
                const data = await api.login({ email: form.email, password: form.password });
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FF8A65] to-[#FF6B3D] flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl sm:p-10">

                {/* 로고 */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFE5DB] mx-auto flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z"
                                  stroke="#FF6B3D" strokeWidth="2" strokeLinejoin="round" fill="#FF6B3D" fillOpacity="0.15"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-[#FF6B3D] mt-3 mb-1 sm:text-3xl">CareVision</h1>
                    <p className="text-xs text-gray-500 sm:text-sm">보호자 모니터링</p>
                </div>

                {/* 탭 */}
                <div className="flex rounded-full bg-gray-100 p-1 mb-6">
                    <button
                        type="button"
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-colors min-h-[40px] border-none cursor-pointer ${
                            mode === 'login'
                                ? 'bg-[#FF6B3D] text-white'
                                : 'bg-transparent text-gray-500'
                        }`}
                        onClick={() => setMode('login')}
                    >
                        로그인
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-colors min-h-[40px] border-none cursor-pointer ${
                            mode === 'register'
                                ? 'bg-[#FF6B3D] text-white'
                                : 'bg-transparent text-gray-500'
                        }`}
                        onClick={() => setMode('register')}
                    >
                        회원가입
                    </button>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {mode === 'register' && (
                        <input
                            className="px-4 py-3 border border-gray-200 rounded-xl text-base outline-none w-full transition-colors focus:border-[#FF6B3D] focus:ring-2 focus:ring-[#FFE5DB] appearance-none bg-gray-50"
                            name="name"
                            placeholder="이름"
                            value={form.name}
                            onChange={handleChange}
                            autoComplete="name"
                            required
                        />
                    )}
                    <input
                        className="px-4 py-3 border border-gray-200 rounded-xl text-base outline-none w-full transition-colors focus:border-[#FF6B3D] focus:ring-2 focus:ring-[#FFE5DB] appearance-none bg-gray-50"
                        name="email"
                        type="email"
                        placeholder="이메일"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                        inputMode="email"
                        required
                    />
                    <input
                        className="px-4 py-3 border border-gray-200 rounded-xl text-base outline-none w-full transition-colors focus:border-[#FF6B3D] focus:ring-2 focus:ring-[#FFE5DB] appearance-none bg-gray-50"
                        name="password"
                        type="password"
                        placeholder="비밀번호"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                    />

                    {error && (
                        <p className={`text-xs text-center ${error.includes('완료') ? 'text-[#10B981]' : 'text-red-600'}`}>
                            {error}
                        </p>
                    )}

                    <button
                        className="mt-2 py-3.5 bg-[#FF6B3D] text-white rounded-xl text-sm font-bold w-full min-h-[48px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:bg-[#E8552B] appearance-none border-none cursor-pointer"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                    </button>
                </form>
            </div>
        </div>
    );
}
