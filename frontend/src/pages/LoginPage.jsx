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
        <>
            <style>{`
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                .login-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }

                .login-card {
                    background: #fff;
                    border-radius: 16px;
                    padding: 40px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                }

                .logo {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .logo-icon {
                    font-size: 40px;
                    display: block;
                }

                .logo-text {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1e40af;
                    margin: 8px 0 4px;
                }

                .logo-sub {
                    font-size: 13px;
                    color: #6b7280;
                }

                .tabs {
                    display: flex;
                    margin-bottom: 24px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                }

                .tab {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    background: #f9fafb;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #6b7280;
                    transition: background 0.2s, color 0.2s;
                    /* 모바일 탭 터치 영역 확보 */
                    min-height: 44px;
                }

                .tab:active {
                    opacity: 0.8;
                }

                .tab-active {
                    background: #1e40af;
                    color: #fff;
                }

                .form {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .input {
                    padding: 12px 14px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 16px; /* iOS 자동 확대 방지: 16px 이상 필수 */
                    outline: none;
                    width: 100%;
                    transition: border-color 0.2s;
                    /* 모바일 네이티브 스타일 제거 */
                    -webkit-appearance: none;
                    appearance: none;
                }

                .input:focus {
                    border-color: #1e40af;
                    box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
                }

                .message {
                    font-size: 13px;
                    text-align: center;
                }

                .message-success {
                    color: #16a34a;
                }

                .message-error {
                    color: #dc2626;
                }

                .submit-button {
                    padding: 14px;
                    background: #1e40af;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 4px;
                    width: 100%;
                    /* 모바일 터치 영역 확보 */
                    min-height: 48px;
                    transition: background 0.2s, opacity 0.2s;
                    /* 모바일 버튼 스타일 초기화 */
                    -webkit-appearance: none;
                    appearance: none;
                }

                .submit-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .submit-button:not(:disabled):active {
                    background: #1e3a8a;
                }

                /* ── 모바일 반응형 (480px 이하) ── */
                @media (max-width: 480px) {
                    .login-container {
                        padding: 0;
                        align-items: flex-start;
                    }

                    .login-card {
                        border-radius: 0;
                        min-height: 100vh;
                        padding: 48px 24px 32px;
                        box-shadow: none;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }

                    .logo-icon {
                        font-size: 48px;
                    }

                    .logo-text {
                        font-size: 32px;
                    }

                    .logo-sub {
                        font-size: 14px;
                    }

                    .logo {
                        margin-bottom: 32px;
                    }
                }

                /* ── 소형 모바일 (360px 이하) ── */
                @media (max-width: 360px) {
                    .login-card {
                        padding: 40px 16px 24px;
                    }

                    .logo-text {
                        font-size: 26px;
                    }

                    .tab {
                        font-size: 13px;
                    }
                }

                /* ── 태블릿 (481px ~ 768px) ── */
                @media (min-width: 481px) and (max-width: 768px) {
                    .login-container {
                        padding: 24px;
                    }

                    .login-card {
                        padding: 36px 32px;
                    }
                }

                /* ── 가로 모드 모바일 ── */
                @media (max-width: 768px) and (orientation: landscape) {
                    .login-container {
                        align-items: flex-start;
                        padding: 16px;
                    }

                    .login-card {
                        min-height: auto;
                        border-radius: 16px;
                        padding: 24px;
                    }

                    .logo {
                        margin-bottom: 16px;
                    }

                    .logo-icon {
                        font-size: 32px;
                    }

                    .logo-text {
                        font-size: 22px;
                        margin: 4px 0 2px;
                    }
                }
            `}</style>

            <div className="login-container">
                <div className="login-card">
                    <div className="logo">
                        <span className="logo-icon">👁️</span>
                        <h1 className="logo-text">CareVision</h1>
                        <p className="logo-sub">독거노인 스마트 케어 모니터링</p>
                    </div>

                    <div className="tabs">
                        <button
                            className={`tab ${mode === 'login' ? 'tab-active' : ''}`}
                            onClick={() => setMode('login')}
                            type="button"
                        >
                            로그인
                        </button>
                        <button
                            className={`tab ${mode === 'register' ? 'tab-active' : ''}`}
                            onClick={() => setMode('register')}
                            type="button"
                        >
                            회원가입
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="form">
                        {mode === 'register' && (
                            <input
                                className="input"
                                name="name"
                                placeholder="이름"
                                value={form.name}
                                onChange={handleChange}
                                autoComplete="name"
                                required
                            />
                        )}
                        <input
                            className="input"
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
                            className="input"
                            name="password"
                            type="password"
                            placeholder="비밀번호"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                        />
                        {error && (
                            <p className={`message ${error.includes('완료') ? 'message-success' : 'message-error'}`}>
                                {error}
                            </p>
                        )}
                        <button
                            className="submit-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
