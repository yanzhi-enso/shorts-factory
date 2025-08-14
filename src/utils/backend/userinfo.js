export function extractUserId(req) {
    if (process.env.NODE_ENV === 'development') {
        // in dev mode, we don't have the special google header
        return 'developer@enso-ai.com';
    }

    // Extract user info from IAP headers
    const rawEmail = req.headers.get('x-goog-authenticated-user-email');
    const userEmail = rawEmail ? rawEmail.split(':')[1] : null;

    return userEmail
}