const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const unitName = '제7부대';
  const unit = await prisma.unit.findFirst({
    where: { name: unitName },
  });

  if (!unit) {
    console.log(`Unit ${unitName} not found`);
    return;
  }

  console.log(`Checking Unit: ${unit.name} (ID: ${unit.id})`);

  const schedules = await prisma.unitSchedule.findMany({
    where: { unitId: unit.id },
    include: {
      assignments: {
        where: { state: 'Accepted' }, // Only concerned with Accepted for Confirmed messages
        include: {
          messageAssignments: {
            include: {
              message: true,
            },
          },
          User: {
            include: {
              instructor: true,
            },
          },
        },
      },
    },
  });

  let totalAssignments = 0;
  let confirmedMsgCount = 0;

  for (const schedule of schedules) {
    if (schedule.assignments.length > 0) {
      console.log(`\nSchedule ID: ${schedule.id} (${schedule.date})`);
      for (const assignment of schedule.assignments) {
        totalAssignments++;
        const hasConfirmed = assignment.messageAssignments.some(
          (ma) => ma.message.type === 'Confirmed',
        );
        if (hasConfirmed) confirmedMsgCount++;

        console.log(`  - Instructor: ${assignment.User.name} (ID: ${assignment.userId})`);
        console.log(`    State: ${assignment.state}, Classification: ${assignment.classification}`);
        console.log(`    Message Assignments: ${assignment.messageAssignments.length}`);
        assignment.messageAssignments.forEach((ma) => {
          console.log(
            `      -> MsgID: ${ma.messageId}, Type: ${ma.message.type}, Status: ${ma.message.status}`,
          );
        });
        if (!hasConfirmed) {
          console.log(`    [!] NO CONFIRMED MESSAGE FOUND`);
        }
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`Total Accepted Assignments: ${totalAssignments}`);
  console.log(`Assignments with Confirmed Message: ${confirmedMsgCount}`);

  if (totalAssignments > confirmedMsgCount) {
    console.log(`Result: UNIT IS UNSENT (Partial or None)`);
  } else {
    console.log(`Result: UNIT IS SENT`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
