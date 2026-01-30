-- CreateTable "user_teams"
CREATE TABLE "user_teams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_teams_user_id_idx" ON "user_teams"("user_id");

-- CreateIndex
CREATE INDEX "user_teams_team_id_idx" ON "user_teams"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_teams_user_id_team_id_key" ON "user_teams"("user_id", "team_id");

-- AddForeignKey
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
