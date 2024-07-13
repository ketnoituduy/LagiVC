// Can use this function below or use Expo's Push Notification Tool from: https://expo.dev/notifications
const  sendPushNotification = async(expoPushToken, title, body) =>{
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      vibrate: true,
      data: { someData: 'goes here' },
    };
  
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  }

  module.exports = sendPushNotification;