import { API_URL } from '../../../shared/api/axios';

export function SocialLoginButtons() {
  return (
    <>
      <div className="social-divider">
        <span>or continue with</span>
      </div>
      <div className="social-buttons">
        <button
          type="button"
          className="btn-social google"
          onClick={() => {
            window.location.href = `${API_URL}/auth/google`;
          }}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="btn-social facebook"
          onClick={() => {
            window.location.href = `${API_URL}/auth/facebook`;
          }}
        >
          Continue with Facebook
        </button>
        <button
          type="button"
          className="btn-social instagram"
          onClick={() => {
            window.location.href = `${API_URL}/auth/instagram`;
          }}
        >
          Continue with Instagram
        </button>
      </div>
    </>
  );
}
