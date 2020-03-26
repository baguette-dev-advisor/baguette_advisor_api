const nodemailer  = require('nodemailer');
const mailjet = require('node-mailjet');
const config = require('../../config/config');

var sendRecoveryMail = function(usermail, recoverToken, username, next) {
  const mailer = mailjet.connect(config.mailer.public_key, config.mailer.private_key)
  const request = mailer.post("send").request({
    "FromEmail": config.mailer.mail_bot_addr,
    "FromName": config.mailer.mail_bot_name,
    "Subject": "Password recovery for Baguette Advisor",
    "Text-part": "test",
    "Html-part": "<h3>Hello "+username+"!</h3><p>Someone has requested a link to change your password. If it was you, you can do this through the link below.<p><a href=\""+config.publicDN+"/recover/"+recoverToken+"\">Change my password</a></p><p>Your password will not change until you access the link above and create a new one.</p><p><b>/!\\ If you did not request this, please ignore this email /!\\</b></p><p>Best Regards,</p><p>In Baguette We Trust !</p>",
    "Recipients": [{"Email":usermail}]
  })
  request.then((result) => {
    return next(null, result)
  })
  .catch(err => {
    return next(err, null)
  });
}

var sendDeleteMail = function(usermail, deleteToken, next) {
  console.log("sending mail")
  const mailer = mailjet.connect(config.mailer.public_key, config.mailer.private_key)
  const request = mailer.post("send").request({
    "FromEmail": config.mailer.mail_bot_addr,
    "FromName": config.mailer.mail_bot_name,
    "Subject": "Bienvenue sur Baguette Advisor",
    "Text-part": "test",
    "Html-part": "<h3>Bienvenue à vous !</h3><br><img src=\"https://www.baguetteadvisor.com/wp-content/uploads/2017/01/cropped-logo_baguette_advisor.png\"><p>Vous avez créé un compte sur l'application mobile Baguette Advisor avec cette adresse : "+usermail+" et à présent vous faites partie de la communauté pour mieux partager vos bons plans, les meilleurs produits et tout cela selon vos goûts !<br>Si vous avez une question n'hésitez pas à en faire part à notre équipe <a href=\"mailto:hello@baguetteadvisor.com\">hello@baguetteadvisor.com</a> (mailto:)<br>Merci et à bientôt.<br>In #Baguette We trust !<br>***<br>Si vous n'êtes pas à l'origine de cette création de compte et que vous êtes bien le détenteur de cette addresse mentionnée ci-dessus alors vous avez le droit de fermer ce compte en cliquant sur le lien suivant valable 72 heures > <a href=\"https://api.baguetteadvisor.com/user/delete/"+deleteToken+"\">Supprimer mon compte</a><br>Passé ces 72 heures, toute demande de suppression de compte peut être faite en contactant cette adresse <a href=\"mailto:privacy@baguetteadvisor.com\">privacy@baguetteadvisor.com</a> (mailto:)<br>***</p>",
    "Recipients": [{"Email":usermail}]
  })
  request.then((result) => {
    return next(null, result)
  })
  .catch(err => {
    return next(err, null)
  });
}

module.exports = {
  sendRecoveryMail: sendRecoveryMail,
  sendDeleteMail: sendDeleteMail
}
