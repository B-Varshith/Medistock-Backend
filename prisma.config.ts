/// <reference types="node" />
import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
    schema: 'Prisma/schema.prisma',
    datasource: {
        url: 'postgresql://postgres:postgres@127.0.0.1:5455/medistock',
    },
});
