/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
                port: '',
                pathname: '/shorts-scenes/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.klingai.com',
                port: '',
            },
        ],
    },
};

export default nextConfig;
