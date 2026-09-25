-- CreateEnum
CREATE TYPE "GroceryCategory" AS ENUM ('FOOD', 'BEVERAGES', 'MEAT', 'FROZEN', 'DAIRY_AND_DELI', 'PERSONAL_CARE', 'PRODUCE', 'CLEANING', 'PANTRY', 'BAKERY', 'PETS', 'HOUSEHOLD');

-- CreateTable
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "idealQuantity" DECIMAL(10,2) NOT NULL,
    "currentQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimatedPrice" DECIMAL(10,2) NOT NULL,
    "category" "GroceryCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroceryBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroceryItem_userId_category_name_idx" ON "GroceryItem"("userId", "category", "name");

-- CreateIndex
CREATE INDEX "GroceryBudget_userId_createdAt_idx" ON "GroceryBudget"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GroceryItem" ADD CONSTRAINT "GroceryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryBudget" ADD CONSTRAINT "GroceryBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
