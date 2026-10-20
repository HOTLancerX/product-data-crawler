import { addHook, type PluginMeta } from "@/hook";
import ProductDataCrawlerAdminPage from "./admin/page";

export const PLUGINS: PluginMeta = {
    nx: "product-data-crawler",
    name: "Product Data Crawler",
    version: "1.0.0",
    description: "WooCommerce & E-commerce Product Crawler with sitemap parser, Store API integration, reboot-safe storage, and JSON exports.",
    author: "System",
    path: "https://github.com/HOTLancerX/product-data-crawler.git",
    icon: "solar:cart-large-minimalistic-bold",
    color: "from-amber-500 to-orange-500",
};

export function register() {
    // ─── Admin Navigation Hook ────────────────────────────────────────────────
    addHook("admin.nav", [
        {
            key: "product-data-crawler",
            label: "Product Crawler",
            icon: "solar:cart-large-minimalistic-bold",
            slug: "product-data-crawler",
            parent: "",
            position: 29,
        },
    ], PLUGINS.nx);

    // ─── Admin Pages Hook ─────────────────────────────────────────────────────
    addHook("admin.pages", [
        {
            key: "product-data-crawler",
            label: "Product Crawler",
            path: ProductDataCrawlerAdminPage,
            style: "left",
        },
    ], PLUGINS.nx);
}
