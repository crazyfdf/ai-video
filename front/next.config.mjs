/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '1198',
                pathname: '/images/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '1198',
                pathname: '/temp/**',
            },
            {
                protocol: 'https',
                hostname: 'easyai-1257264070.cos.ap-shanghai.myqcloud.com',
                pathname: '/image/**',
            },
        ],
    },
};

export default nextConfig;

