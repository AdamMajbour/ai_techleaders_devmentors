const fs = require('node:fs');
const bcrypt = require('bcryptjs');
for (const line of fs.readFileSync('.ai/qa/test-env.env', 'utf8').split(/\r?\n/)) {
  const match = /^([^#=]+)=(.*)$/.exec(line);
  if (match) process.env[match[1]] = match[2];
}
const { MikroORM } = require('@mikro-orm/postgresql');
const { mikroOrmConfig } = require('../../packages/db/src/config');
const { User, Invitation } = require('../../packages/db/src/entities');
(async()=>{const orm=await MikroORM.init(mikroOrmConfig);try{const em=orm.em.fork();const email=process.env.QA_MENTOR_EMAIL;const passwordHash=await bcrypt.hash(process.env.QA_MENTOR_PASSWORD,12);let user=await em.findOne(User,{email});if(!user){user=em.create(User,{email,name:'QA Mentor',passwordHash});em.persist(user)}let invite=await em.findOne(Invitation,{email});if(!invite){invite=em.create(Invitation,{email,displayName:'QA Mentor',role:'mentor',invitedBy:null,acceptedByUserId:user.id,acceptedAt:new Date(),revokedAt:null});em.persist(invite)}await em.flush();console.log('QA mentor fixture ready.')}finally{await orm.close(true)}})().catch(e=>{console.error(e);process.exitCode=1});
