
export function getProduct(id) {
    for (const item of menuItems) {
        if (item.id === id) {
            return item;
        }
    }
    return null; // or undefined if not found
}




export const menuItems = [
    {
        id:"e43638ce-6aa0-4b85-b27f-e1d071b678c0",
        name: "Chapatii",
        image: "./images/chapati.jpg",
       priceCents: 1099,
        availability: "available",
        diet: ["vegetarian"],
        description: "Fresh served with hot tea"
    },
    {
        id:"e43638ce-6aa0-4b85-b27f-e1d071b678c1",
        name: "Bean Stew",
        image: "./images/bean stew.jpeg",
         priceCents: 2099,
        availability: "available",
        diet: ["gluten-free"],
        description: "made with natural spices"
    },
    {
        id:"e43638ce-6aa0-4b85-b27f-e1d071b678c2",
        name: "Ugali and Fish",
        image: "./images/ugali fish.jpg",
       priceCents: 6099,
        availability: "limited",
        diet: ["gluten-free"],
        description: "Tilapia fish served with ugali"
    },
    {
        id:"e43638ce-6aa0-4b85-b27f-e1d071b678c3",
        name: "Plain Rice",
        image: "./images/Rice.jpg",
       priceCents: 2599,
        availability: "limited",
        diet: ["gluten-free"],
        description: "Grade 1 Pishori rice"
    },
    {
        id:"e43638ce-6aa0-4b85-b27f-e1d071b678c4",
        name: "Beef Stew",
        image: "./images/beef.jpg",
       priceCents: 1599,
        availability: "limited",
        diet: ["gluten-free"],
        description: "Tasty beef stew with natural spices"
    },
    {
        id:"e43638ce-6aa0-4b85-b27f-e1d071b678c5",
        name: "spaghetti",
        image: "./images/food4.jpg",
       priceCents: 1599,
        availability: "available",
        diet: ["gluten-free"],
        description: "Juicy iced  marinated honey"
    },

];
