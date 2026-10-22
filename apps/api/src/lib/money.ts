import { Prisma } from "../generated/prisma/client.ts";

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
export type MoneyInput = Prisma.Decimal | string | number;

// JOD has 3 minor digits; every authoritative amount is rounded here.
export const money = (v: MoneyInput) => new Decimal(v).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
export const fmt = (v: MoneyInput) => money(v).toFixed(3);
