"""
Page Object para Autenticación (Login / Registro / Recuperación).
"""
from typing import Optional

from pages.base_page import BasePage


class AuthPage(BasePage):
    """Login, registro y recuperación de contraseña."""

    # ─── Selectores ────────────────────────────

    # Login
    LOGIN_FORM = "#login, .login-form, [data-testid='login']"
    LOGIN_EMAIL = "#loginEmail, #email, [name='email']"
    LOGIN_PASSWORD = "#loginPassword, #password, [name='password']"
    LOGIN_BTN = "#loginBtn, .btn-login, [type='submit']"
    LOGIN_ERROR = ".login-error, .error-msg"

    # Registro
    REGISTER_FORM = "#register, .register-form, [data-testid='register']"
    REGISTER_NAME = "#registerName, #fullName, [name='fullName']"
    REGISTER_EMAIL = "#registerEmail, #email, [name='email']"
    REGISTER_PHONE = "#registerPhone, #phone, [name='phone']"
    REGISTER_PASSWORD = "#registerPassword, #password, [name='password']"
    REGISTER_CONFIRM = "#registerConfirm, #confirmPassword"
    REGISTER_BTN = "#registerBtn, .btn-register"
    REGISTER_SUCCESS = ".register-success"

    # Recuperación
    FORGOT_PASSWORD_LINK = ".forgot-password, #forgotPassword"
    RESET_EMAIL = "#resetEmail, #email, [name='email']"
    RESET_BTN = "#resetBtn, .btn-reset"
    RESET_SUCCESS = ".reset-success, .reset-message"

    # Perfil / Sesión
    USER_MENU = ".user-menu, #userMenu, .profile"
    USER_NAME = ".user-name, #userName"
    LOGOUT_BTN = ".logout-btn, #logoutBtn"

    @property
    def is_logged_in(self) -> bool:
        """Verificar si hay sesión activa."""
        return self.is_visible(self.USER_MENU)

    def get_logged_user_name(self) -> Optional[str]:
        """Obtener nombre del usuario logueado."""
        if self.is_logged_in:
            return self.get_text(self.USER_NAME)
        return None

    # ─── Login ─────────────────────────────────

    def navigate_to_login(self):
        """Navegar a la página de login."""
        self.navigate("/login")
        self.wait_for_selector(self.LOGIN_FORM)

    def login(self, email: str, password: str):
        """Iniciar sesión con credenciales."""
        self.fill(self.LOGIN_EMAIL, email)
        self.fill(self.LOGIN_PASSWORD, password)
        self.click(self.LOGIN_BTN)
        self.wait(500)

    def logout(self):
        """Cerrar sesión."""
        if self.is_visible(self.USER_MENU):
            self.click(self.USER_MENU)
            self.wait(200)
            if self.is_visible(self.LOGOUT_BTN):
                self.click(self.LOGOUT_BTN)
                self.wait(300)

    def get_login_error(self) -> Optional[str]:
        """Obtener mensaje de error en login."""
        if self.is_visible(self.LOGIN_ERROR):
            return self.get_text(self.LOGIN_ERROR)
        return None

    # ─── Registro ──────────────────────────────

    def navigate_to_register(self):
        """Navegar a la página de registro."""
        self.navigate("/register")
        self.wait_for_selector(self.REGISTER_FORM)

    def register(self, name: str, email: str, phone: str, password: str):
        """Registrar un nuevo usuario."""
        self.fill(self.REGISTER_NAME, name)
        self.fill(self.REGISTER_EMAIL, email)
        self.fill(self.REGISTER_PHONE, phone)
        self.fill(self.REGISTER_PASSWORD, password)
        self.click(self.REGISTER_BTN)
        self.wait(500)

    def is_registration_successful(self) -> bool:
        """Verificar si el registro fue exitoso."""
        return self.is_visible(self.REGISTER_SUCCESS)

    # ─── Recuperación ──────────────────────────

    def navigate_to_forgot_password(self):
        """Navegar a recuperación de contraseña."""
        if not self.is_visible(self.RESET_EMAIL):
            self.navigate_to_login()
            if self.is_visible(self.FORGOT_PASSWORD_LINK):
                self.click(self.FORGOT_PASSWORD_LINK)

    def request_password_reset(self, email: str):
        """Solicitar recuperación de contraseña."""
        self.fill(self.RESET_EMAIL, email)
        self.click(self.RESET_BTN)
        self.wait(500)

    def is_reset_successful(self) -> bool:
        """Verificar si la solicitud de reset fue exitosa."""
        return self.is_visible(self.RESET_SUCCESS)

    # ─── Assertions ──────────────────────────

    def assert_login_form_visible(self):
        """Verificar que el formulario de login es visible."""
        self.assert_visible(self.LOGIN_EMAIL)
        self.assert_visible(self.LOGIN_PASSWORD)

    def assert_register_form_visible(self):
        """Verificar que el formulario de registro es visible."""
        self.assert_visible(self.REGISTER_NAME)
        self.assert_visible(self.REGISTER_EMAIL)
        self.assert_visible(self.REGISTER_PASSWORD)
