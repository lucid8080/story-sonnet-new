/**
 * Print featured image URL + storage key for a blog post (defaults to daffodil post slug).
 * Uses DATABASE_URL from env — run against production with prod .env to verify before/after backfill.
 *
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/check-blog-featured-url.ts [slug]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug =
    process.argv[2]?.trim() ||
    'blooming-hope-celebrating-daffodil-month-for-cancer-awareness';
  const row = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      slug: true,
      featuredImageUrl: true,
      featuredImageStorageKey: true,
    },
  });
  if (!row) {
    console.error(`No blog post with slug: ${slug}`);
    process.exit(1);
  }
  console.log(JSON.stringify(row, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
