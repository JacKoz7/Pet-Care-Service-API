/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'polskapogodzinach.pl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'shutterstock.com.pl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'akc.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.akc.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'visitwroclaw.s3.eu-central-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'zzaoceanu.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "media.istockphoto.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'rewapark.pl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.immediate.co.uk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'meteor-turystyka.pl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.visitradom.pl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'podkarpackie.travel',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.polskieszlaki.pl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;