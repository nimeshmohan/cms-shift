## Packages
framer-motion | Page transitions and smooth wizard step animations

## Notes
The application expects `@shared/routes` to export `api`, `buildUrl`, and the schemas as defined in the prompt.
The Webflow API endpoints (collections, fields) are POST methods in the API contract, taking a `token` in the body.
Jobs endpoint requires polling `GET /api/jobs/:id` for progress updates.
