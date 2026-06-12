import { prisma } from "@/lib/prisma";

async function cleanup() {
  console.log("🧹 Starting data cleanup...");

  try {
    // Delete in order of foreign key dependencies
    console.log("  Deleting OrderItems...");
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`    ✓ Deleted ${deletedOrderItems.count} order items`);

    console.log("  Deleting Orders...");
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`    ✓ Deleted ${deletedOrders.count} orders`);

    console.log("  Deleting InventoryMovements...");
    const deletedMovements = await prisma.inventoryMovement.deleteMany({});
    console.log(`    ✓ Deleted ${deletedMovements.count} inventory movements`);

    console.log("  Deleting Products...");
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`    ✓ Deleted ${deletedProducts.count} products`);

    console.log("  Deleting ImportLogs...");
    const deletedLogs = await prisma.importLog.deleteMany({});
    console.log(`    ✓ Deleted ${deletedLogs.count} import logs`);

    console.log("\n✅ Cleanup complete! Database is now clean.\n");

    console.log("Summary:");
    console.log(`  - Products: ${deletedProducts.count}`);
    console.log(`  - Orders: ${deletedOrders.count}`);
    console.log(`  - Order Items: ${deletedOrderItems.count}`);
    console.log(`  - Inventory Movements: ${deletedMovements.count}`);
    console.log(`  - Import Logs: ${deletedLogs.count}`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
