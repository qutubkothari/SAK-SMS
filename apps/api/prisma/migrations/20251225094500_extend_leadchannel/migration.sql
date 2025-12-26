-- Extend LeadChannel enum for additional enquiry sources
-- Note: PostgreSQL enums can only ADD VALUE (cannot remove/reorder easily).

ALTER TYPE "LeadChannel" ADD VALUE 'JUSTDIAL';
ALTER TYPE "LeadChannel" ADD VALUE 'GEM';
ALTER TYPE "LeadChannel" ADD VALUE 'PHONE';
ALTER TYPE "LeadChannel" ADD VALUE 'EMAIL';
ALTER TYPE "LeadChannel" ADD VALUE 'PERSONAL_VISIT';
