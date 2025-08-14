import { NextResponse } from 'next/server';
import { extractUserId } from 'utils/backend/userinfo'

// extract google iap header
export async function GET(req) {
    try {
        const userEmail = extractUserId(req)

        if (!userEmail) {
            return NextResponse.json(
                { error: 'No user information found' },
                { status: 401 }
            );
        }

        // Return user info
        return NextResponse.json({
            email: userEmail,
            name: userEmail.split('@')[0], // Extract name from email
            domain: userEmail.split('@')[1]
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Failed to get user info' },
            { status: 500 }
        );
    }
}