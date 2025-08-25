/**Step 1: connect to the rabbitmq server */
const amqp = require('amqplib');

const consume=async function consumeMessages() {
    try {
        //connect to the rabbitmq server
        const connection = await amqp.connect("amqp://admin:Blineadmin7@10.20.142.211:5672");// Replace with your RabbitMQ server URL
        //create a new channel
        const channel = await connection.createChannel();
        //create a new exchange
        const exchange = 'my_exchange'; // Replace with your exchange name
        await channel.assertExchange(exchange, 'direct', { durable: true });
        //create a new queue
        const queue = 'my_queue'; // Replace with your queue name

        await channel.assertQueue(queue, { durable: true });

        console.log(`Waiting for messages in ${queue}. To exit press CTRL+C`);
        //bind the queue to the exchange with a routing key
        await channel.bindQueue(queue, exchange, 'my_routing_key'); // Replace with your routing key
        //consume messages from the queue
        channel.consume(queue, (msg) => {
            if (msg !== null) {
                console.log(`Received message: ${JSON.parse(msg.content.toString())}`);
                channel.ack(msg); // Acknowledge the message
            }
        });
    } catch (error) {
        console.error('Error consuming messages:', error);
    }
}

module.exports=consume;