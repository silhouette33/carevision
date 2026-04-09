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
        <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-500 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl sm:p-10">

                {/* 로고 */}
                <div className="text-center mb-6">
                    <span className="text-5xl block">👁️</span>
                    <h1 className="text-2xl font-bold text-blue-800 mt-2 mb-1 sm:text-3xl">CareVision</h1>
                    <p className="text-xs text-gray-500 sm:text-sm">독거노인 스마트 케어 모니터링</p>
                </div>

                {/* 탭 */}
                <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
                    <button
                        type="button"
                        className={`flex-1 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                            mode === 'login'
                                ? 'bg-blue-800 text-white'
                                : 'bg-gray-50 text-gray-500'
                        }`}
                        onClick={() => setMode('login')}
                    >
                        로그인
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                            mode === 'register'
                                ? 'bg-blue-800 text-white'
                                : 'bg-gray-50 text-gray-500'
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
                            className="px-3 py-3 border border-gray-300 rounded-lg text-base outline-none w-full transition-colors focus:border-blue-800 focus:ring-2 focus:ring-blue-100 appearance-none"
                            name="name"
                            placeholder="이름"
                            value={form.name}
                            onChange={handleChange}
                            autoComplete="name"
                            required
                        />
                    )}
                    <input
                        className="px-3 py-3 border border-gray-300 rounded-lg text-base outline-none w-full transition-colors focus:border-blue-800 focus:ring-2 focus:ring-blue-100 appearance-none"
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
                        className="px-3 py-3 border border-gray-300 rounded-lg text-base outline-none w-full transition-colors focus:border-blue-800 focus:ring-2 focus:ring-blue-100 appearance-none"
                        name="password"
                        type="password"
                        placeholder="비밀번호"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                    />

                    {error && (
                        <p className={`text-xs text-center ${error.includes('완료') ? 'text-green-600' : 'text-red-600'}`}>
                            {error}
                        </p>
                    )}

                    <button
                        className="mt-1 py-3 bg-blue-800 text-white rounded-lg text-sm font-semibold w-full min-h-[48px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:bg-blue-900 appearance-none"
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
