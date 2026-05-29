-- Add archived account status for admin customer archival (hidden from default list, login blocked)
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'archived';
