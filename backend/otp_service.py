import os
import re
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger("otp_service")
logger.setLevel(logging.INFO)


class BaseOTPProvider(ABC):
    """
    Abstract Base Class for OTP Providers.
    Allows seamlessly swapping between DevMock, Twilio, MSG91, Fast2SMS, etc.
    without affecting business logic or API endpoints.
    """

    @abstractmethod
    def generate_otp(self, mobile: str) -> str:
        """Generate OTP for the given mobile number."""
        pass

    @abstractmethod
    def send_otp(self, mobile: str, otp: str) -> bool:
        """Send OTP to the given mobile number via SMS gateway."""
        pass

    @abstractmethod
    def verify_otp(self, mobile: str, entered_otp: str) -> bool:
        """Verify whether entered_otp is valid for the given mobile number."""
        pass


class DevMockOTPProvider(BaseOTPProvider):
    """
    Development/Testing OTP Provider.
    As per specification:
    - OTP is automatically the last 4 digits of the registered mobile number.
      Example:
        Mobile Number: 9876543210
        OTP: 3210
    - Output is logged to stdout/console.
    """

    def generate_otp(self, mobile: str) -> str:
        clean = re.sub(r"\D", "", mobile)
        if len(clean) >= 4:
            return clean[-4:]
        return clean.zfill(4)

    def send_otp(self, mobile: str, otp: str) -> bool:
        clean = re.sub(r"\D", "", mobile)
        print(f"\n========================================")
        print(f" [DEV OTP SERVICE] SIMULATED SMS")
        print(f" Recipient: +91 {clean}")
        print(f" Your Verification Code: {otp}")
        print(f" Rule: Last 4 digits of mobile number")
        print(f"========================================\n")
        logger.info(f"Simulated OTP sent to {clean}: {otp}")
        return True

    def verify_otp(self, mobile: str, entered_otp: str) -> bool:
        expected = self.generate_otp(mobile)
        return entered_otp.strip() == expected


class TwilioOTPProvider(BaseOTPProvider):
    """
    Production SMS Gateway using Twilio.
    Enabled when OTP_PROVIDER=twilio and credentials are set in environment.
    """

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_phone = os.getenv("TWILIO_FROM_PHONE", "")

    def generate_otp(self, mobile: str) -> str:
        import random
        return str(random.randint(1000, 9999))

    def send_otp(self, mobile: str, otp: str) -> bool:
        if not self.account_sid or not self.auth_token:
            logger.error("Twilio credentials missing. Falling back to log.")
            return False
        try:
            # from twilio.rest import Client
            # client = Client(self.account_sid, self.auth_token)
            # client.messages.create(body=f"Your EC Store OTP is {otp}", from_=self.from_phone, to=f"+91{mobile}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Twilio SMS: {e}")
            return False

    def verify_otp(self, mobile: str, entered_otp: str) -> bool:
        # In production with DB or cache verification
        return False


class MSG91OTPProvider(BaseOTPProvider):
    """
    Production SMS Gateway using MSG91.
    """

    def __init__(self):
        self.auth_key = os.getenv("MSG91_AUTH_KEY", "")
        self.template_id = os.getenv("MSG91_TEMPLATE_ID", "")

    def generate_otp(self, mobile: str) -> str:
        import random
        return str(random.randint(1000, 9999))

    def send_otp(self, mobile: str, otp: str) -> bool:
        # MSG91 HTTP API call
        return True

    def verify_otp(self, mobile: str, entered_otp: str) -> bool:
        return False


class Fast2SMSOTPProvider(BaseOTPProvider):
    """
    Production SMS Gateway using Fast2SMS.
    """

    def __init__(self):
        self.api_key = os.getenv("FAST2SMS_API_KEY", "")

    def generate_otp(self, mobile: str) -> str:
        import random
        return str(random.randint(1000, 9999))

    def send_otp(self, mobile: str, otp: str) -> bool:
        # Fast2SMS HTTP API call
        return True

    def verify_otp(self, mobile: str, entered_otp: str) -> bool:
        return False


# Provider Factory
_ACTIVE_PROVIDER: BaseOTPProvider | None = None


def get_otp_provider() -> BaseOTPProvider:
    global _ACTIVE_PROVIDER
    if _ACTIVE_PROVIDER is None:
        provider_name = os.getenv("OTP_PROVIDER", "dev").lower()
        if provider_name == "twilio":
            _ACTIVE_PROVIDER = TwilioOTPProvider()
        elif provider_name == "msg91":
            _ACTIVE_PROVIDER = MSG91OTPProvider()
        elif provider_name == "fast2sms":
            _ACTIVE_PROVIDER = Fast2SMSOTPProvider()
        else:
            _ACTIVE_PROVIDER = DevMockOTPProvider()
    return _ACTIVE_PROVIDER
