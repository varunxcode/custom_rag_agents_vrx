import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.config import settings

# Modern Supabase projects sign access tokens asymmetrically (ES256) and
# publish the verification key via JWKS, rather than a shared HS256 secret.
_jwks_client = PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")


def _decode(authorization: str) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def get_current_user_id(authorization: str = Header(...)) -> str:
    return _decode(authorization)["sub"]


def get_current_user_is_guest(authorization: str = Header(...)) -> bool:
    return bool(_decode(authorization).get("is_anonymous", False))
