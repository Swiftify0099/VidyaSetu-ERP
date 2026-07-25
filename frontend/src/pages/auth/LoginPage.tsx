import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Shield, GraduationCap, BookOpen, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import '../../theme/tokens.css';
import styles from './LoginPage.module.css';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data);
      toast.success(t('auth.login') + ' ' + t('common.success') + '!');
    } catch (err: any) {
      const message = err?.response?.data?.message || t('auth.invalid_credentials');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'mr' ? 'en' : 'mr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('vidyasetu_lang', newLang);
  };

  const stats = [
    { icon: <GraduationCap size={22} />, label: t('nav.students'), value: '1200+' },
    { icon: <Users size={22} />, label: t('nav.teachers'), value: '80+' },
    { icon: <BookOpen size={22} />, label: t('library.book'), value: '5000+' },
  ];

  return (
    <div className={styles.page}>
      {/* Left Panel — Branding */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <GraduationCap size={36} />
            </div>
            <div>
              <h1 className={styles.appName}>{t('app.name')}</h1>
              <p className={styles.appTagline}>{t('app.tagline')}</p>
            </div>
          </div>

          <div className={styles.heroText}>
            <h2 className={styles.heroTitle}>
              Hindkesri Maruti Mane Vidyalay
            </h2>
            <p className={styles.heroSubtitle}>
              Enterprise School Management System — Empowering Education with Technology
            </p>
          </div>

          <div className={styles.statsRow}>
            {stats.map((stat, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statIcon}>{stat.icon}</div>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.featureList}>
            {['AI Study Assistant', 'Digital Report Cards', 'Fee Management', 'Library System'].map(f => (
              <div key={f} className={styles.featureItem}>
                <Shield size={14} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div className={styles.circle1} />
        <div className={styles.circle2} />
        <div className={styles.circle3} />
      </div>

      {/* Right Panel — Login Form */}
      <div className={styles.rightPanel}>
        {/* Top controls */}
        <div className={styles.topControls}>
          <button
            className={styles.controlBtn}
            onClick={toggleLanguage}
            title="Toggle Language"
          >
            {i18n.language === 'mr' ? 'EN' : 'मर'}
          </button>
          <button
            className={styles.controlBtn}
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {resolvedTheme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <div className={styles.formIconWrap}>
              <Shield size={28} />
            </div>
            <h2 className={styles.formTitle}>{t('auth.welcome_back')}</h2>
            <p className={styles.formSubtitle}>{t('auth.welcome_message')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
            {/* Username */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="username">
                {t('auth.username')}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder={t('auth.username_placeholder')}
                  className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <span className={styles.errorMsg}>{errors.username.message}</span>
              )}
            </div>

            {/* Password */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="password">
                {t('auth.password')}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('auth.password_placeholder')}
                  className={`${styles.input} ${styles.inputWithIcon} ${errors.password ? styles.inputError : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <span className={styles.errorMsg}>{errors.password.message}</span>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div className={styles.formMeta}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} {...register('remember_me')} />
                <span>{t('auth.remember_me')}</span>
              </label>
              <a href="/forgot-password" className={styles.forgotLink}>
                {t('auth.forgot_password')}
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitBtn}
              id="login-submit-btn"
            >
              {isSubmitting && <span className={styles.btnLoader} />}
              <span>{isSubmitting ? t('auth.logging_in') : t('auth.login_button')}</span>
            </button>
          </form>

          {/* Hint */}
          <div className={styles.hint}>
            <Shield size={13} />
            <span>{t('auth.secure_login')} • SSL Encrypted</span>
          </div>
        </div>

        {/* Footer */}
        <p className={styles.footer}>
          &copy; {new Date().getFullYear()} {t('app.name')} · Hindkesri Maruti Mane Vidyalay
        </p>
      </div>
    </div>
  );
}
