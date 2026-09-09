FROM nginx:alpine

# Static site
COPY site/ /usr/share/nginx/html/

# env.js is gitignored on purpose (see site/js/config.js) -- it's generated
# here at build time instead of committed. Since nginx proxies /api/ and
# /admin/ under this same origin (see nginx.conf), the API base is just a
# relative path, not a per-deployment secret.
RUN echo "window.__ENV__ = { API_BASE: '/api' };" > /usr/share/nginx/html/env.js

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
