import { useState } from 'react';
import logo from '../assets/CareVision.png';

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onLogin(form, mode);
        } catch (err) {
            setError(err.message || '오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans flex flex-col justify-center px-6">

            {/* 로고 영역 */}
            <div className="flex flex-col items-center mb-8 gap-2">
                <div className="w-20 h-20 bg-blue-700 rounded-2xl flex items-center justify-center">
                    <img src={logo} alt="logo" className="h-12" />
                </div>
                <span className="font-bold text-blue-700 text-2xl tracking-tight">CareVision</span>
                <span className="text-xs text-gray-400">환자 케어 모니터링 시스템</span>
            </div>

            {/* 카드 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">

                {/* 로그인 / 회원가입 탭 */}
                <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
                    <button
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            mode === 'login'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-400'
                        }`}
                        onClick={() => { setMode('login'); setError(''); }}
                        type="button"
                    >
                        로그인
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            mode === 'register'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-400'
                        }`}
                        onClick={() => { setMode('register'); setError(''); }}
                        type="button"
                    >
                        회원가입
                    </button>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        className="px-3.5 py-3 border border-gray-200 rounded-xl text-sm outline-none w-full bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                        name="username"
                        type="text"
                        placeholder="아이디"
                        value={form.username}
                        onChange={handleChange}
                        autoComplete="username"
                        required
                    />
                    <input
                        className="px-3.5 py-3 border border-gray-200 rounded-xl text-sm outline-none w-full bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                        name="password"
                        type="password"
                        placeholder="비밀번호"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                    />

                    {error && (
                        <p className={`text-xs text-center ${
                            error.includes('완료') ? 'text-green-600' : 'text-red-500'
                        }`}>
                            {error}
                        </p>
                    )}

                    <button
                        className="mt-1 py-3 bg-blue-700 text-white rounded-xl text-sm font-semibold w-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:bg-blue-800"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                    </button>
                </form>
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-5">
                © 2025 CareVision. All rights reserved.
            </p>
        </div>
    );
}