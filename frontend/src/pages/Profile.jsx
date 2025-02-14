import { Mail, Heart, Award, ArrowRight, Shield, CheckCircle2, Rocket, Star, LucideSkull, Leaf } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Avatar, Identity } from '@coinbase/onchainkit/identity';
import VerifiedBadge from '../components/icons/bluebadge.png'
import NewbBadge from '../components/icons/newb.png'
import HodlerBadge from '../components/icons/hodler.png'
import ApeBadge from '../components/icons/ape.png'
import DegenBadge from '../components/icons/degen.png'
import AdminBadge from '../components/icons/admin.png'
import Gorilla from '../components/icons/gorilla.png'
import Skull from '../components/icons/skull.png'
import { Card, CardContent, CardHeader } from '@/components/ui/card';
// import ProgressBar from 'react-progressbar';
import { Progress } from '../components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '../lib/utils';
import Loading from '../components/ui/loading';
import { useSelector } from 'react-redux';
const formatSubscriptionDate = (dateString) => {
    if (!dateString) return null; // Return null if no date string is provided

    // Create a new Date object from the date string
    const date = new Date(dateString);

    // Format the date as MM/DD/YYYY
    const options = {
        year: 'numeric',
        month: '2-digit', // Two-digit month
        day: '2-digit' // Two-digit day
    };

    // Convert to locale string and split to rearrange
    const formattedDate = date.toLocaleDateString('en-US', options);

    return formattedDate.split('/').join('/'); // Rearranging to MM/DD/YYYY
};
const BADGES = [
    {
        type: 'verified',
        label: 'Verified',
        level: 0,
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        condition: 'Verified member',
        className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-md',
        badgeimage: VerifiedBadge
    },
    {
        type: 'newb',
        label: 'Newb',
        level: 1,
        icon: <Leaf className="w-3 h-3 mr-1" />,
        condition: '100+ messages & 50+ likes',
        className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 text-md',
        badgeimage: NewbBadge
    },
    {
        type: 'hodler',
        label: 'Hodler',
        level: 2,
        icon: <Rocket className="w-3 h-3 mr-1" />,
        condition: '500+ messages & 200+ likes',
        className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 text-md',
        badgeimage: HodlerBadge
    },
    {
        type: 'ape',
        label: 'Ape',
        level: 3,
        icon: <img src={Gorilla} className="w-3 h-3 mr-1" />,
        condition: '1000+ messages & 500+ likes',
        className: 'bg-gray-900/10 text-gray-700 hover:bg-gray-900/20 text-md',
        badgeimage: ApeBadge
    },
    {
        type: 'degen',
        label: 'Degen',
        level: 4,
        icon: <img src={Skull} className="w-3 h-3 mr-1" />,
        condition: '2000+ messages & 1000+ likes',
        className: 'bg-gray-900/30 text-black hover:bg-gray-600/80 text-md',
        badgeimage: DegenBadge
    },
    {
        type: 'admin',
        label: 'Admin',
        level: 10,
        icon: <Shield className="w-3 h-3 mr-1" />,
        condition: 'Administrator',
        className: 'bg-green-700/10 text-green-900 hover:bg-green-700/20 text-md',
        badgeimage: AdminBadge
    },
];



const Profile = ({ username, walletAddress }) => {
    // console.log("Profile Wallet Address", walletAddress);
    // const stats = {
    //     messages: 1234,
    //     likes: 789,
    //     currentLevel: 0,
    //     nextLevelThreshold: 2000,
    //     progress: 67, // Current progress percentage to next level
    // };
    const [userData, setUserData] = useState(null);
    const subscriptionEndDate = useSelector((state) => state.auth.subscriptionEndDate);
    const formatedEndDate = subscriptionEndDate ? formatSubscriptionDate(subscriptionEndDate) : '';
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                // console.log("Fetching user profile for username:", `/api/user/${username}`);
                const response = await fetch(`https://backend.debase.app/api/user/${username}`);
                // const response = await fetch(`https://164.90.135.7/api/user/${username}`);
                // const response = await fetch(`https://100.126.119.11/api/user/${username}`);
                // console.log("Response from API:", response);
                const data = await response.json();
                setUserData(data);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };

        if (username) { // Only fetch if username is defined
            fetchUserProfile();
        }
    }, [username]); // Fetch when username changes
    if (!userData) return <Loading />;
    // console.log("User Data:", userData);
    const userBadgeClass = BADGES.find(badge => badge.level === userData.currentLevel)?.className || '';
    const userBadgeLabel = BADGES.find(badge => badge.level === userData.currentLevel).label;
    // switch (userData.currentLevel) {
    //     case 0: return <CheckCircle2 className="w-3 h-3 mr-1" />;
    //     case 1: return <Leaf className="w-3 h-3 mr-1" />;
    //     case 2: return <Rocket className="w-3 h-3 mr-1" />;
    //     case 3: return <Star className="w-3 h-3 mr-1" />;
    //     case 4: return <LucideSkull className="w-3 h-3 mr-1" />;
    //     case 10: return <Shield className="w-3 h-3 mr-1" />;
    // }
    return (
        <div className="container max-w-4xl mx-auto ">
            <Card className="relative overflow-hidden max-w-2xl mx-auto bg-white shadow-lg rounded-lg">
                <div className="absolute top-0  h-32 " />

                <CardHeader className="">
                    <div className="flex flex-col items-center space-y-4 bg-white">
                        <Identity
                            schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
                            address={walletAddress}
                            className='!bg-white w-30 h-30'
                        >
                            <Avatar className='bg-white w-20 h-20 flex items-center justify-center' />
                        </Identity>

                        <div className="text-center">
                            <h1 className="text-2xl font-bold">{username}</h1>
                            {/* <p className="text-muted-foreground">Senior Developer</p> */}
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-4 text-xl">
                                {userData.currentLevel == 0 && <img src={VerifiedBadge} alt="Badge" className="w-8 h-8 mr-2" />}
                                {userData.currentLevel == 1 && <img src={NewbBadge} alt="Badge" className="w-8 h-8 mr-2" />}
                                {userData.currentLevel == 1 && <img src={HodlerBadge} alt="Badge" className="w-8 h-8 mr-2" />}
                                {userData.currentLevel == 3 && <img src={ApeBadge} alt="Badge" className="w-8 h-8 mr-2" />}
                                {userData.currentLevel == 4 && <img src={DegenBadge} alt="Badge" className="w-8 h-8 mr-2" />}
                                {userData.currentLevel == 10 && <img src={AdminBadge} alt="Badge" className="w-8 h-8 mr-2" />}

                                {/* <img src={userData.badge} alt="Badge" className="w-8 h-8 mr-2" /> */}
                                Level {userData.currentLevel}
                            </Badge>
                            <Badge variant="outline" className={`px-4 text-xl
                            ${userBadgeClass}
                            `}>
                                {userBadgeLabel}
                                {userData.currentLevel == 0 && <CheckCircle2 className="w-5 h-5 ml-1" />}
                                {userData.currentLevel == 1 && <Leaf className="w-5 h-5 ml-1" />}
                                {userData.currentLevel == 2 && <Rocket className="w-5 h-5 ml-1" />}
                                {userData.currentLevel == 3 && <img src={Gorilla} className="w-5 h-5 ml-1" />}
                                {userData.currentLevel == 4 && <img src={Skull} className="w-5 h-5 ml-1" />}
                                {userData.currentLevel == 10 && <Shield className="w-5 h-5 ml-1" />} 
                            </Badge>

                        </div>
                        {subscriptionEndDate && (
                            <div className="rounded-lg flex justify-end mb-2">
                                <span className="border-green-600 border-l-4 text-green-700 font-medium bg-green-50 px-4 py-2">Active Until: </span>
                                <span className="text-green-600 bg-green-50 px-4 py-2">{subscriptionEndDate}</span>
                            </div>
                        )}
                        {!subscriptionEndDate && (
                            <div className="rounded-lg flex justify-end mb-2">
                                <span className="border-red-600 border-l-4 text-red-700 font-medium bg-red-50 px-4 py-2">Please Subscribe to Get Access: </span>
                                {/* <span className="text-green-600 bg-green-50 px-4 py-2">{subscriptionEndDate}</span> */}
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
                        <Card>
                            <CardContent className="">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-md font-medium">Messages</span>
                                    </div>
                                    <span className="text-2xl font-bold">{userData.messages}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Heart className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-md font-medium">Likes</span>
                                    </div>
                                    <span className="text-2xl font-bold">{userData.likes}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="mt-6">
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <div className="flex  content-space-between items-center justify-between">
                                    {/* <span className="text-sm font-medium">Next Level Progress</span> */}
                                    {/* <div className="flex  text-md text-muted-foreground"> */}
                                    <span className='text-blue-500'>Level {userData.currentLevel}</span>
                                    {/* <ArrowRight className="w-4 h-4 mx-2 flex items-center" /> */}
                                    <span className=''>Level {userData.currentLevel + 1}</span>
                                    {/* </div> */}
                                </div>
                                <Progress
                                    value={userData.nextLevelThreshold}
                                    className="h-3 [&>div]:bg-blue-500 bg-gray-200"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {userData.nextLevelThreshold}% Complete
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Badge Requirements</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                            {BADGES.map((badge) => (
                                <Card key={badge.type} className="bg-muted/50">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="">
                                            <div className="flex items-center space-x-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("px-2", badge.className)}
                                                >
                                                    {badge.icon}
                                                    {badge.label}
                                                </Badge>
                                            </div>
                                            <p className="text-md text-muted-foreground mt-2">
                                                {badge.condition}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <img src={badge.badgeimage} alt={badge.label} className="w-14 h-14" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                    <div className="mt-6 text-center text-lg text-muted-foreground">
                        <span>Member since </span>
                        <span>{formatSubscriptionDate(userData.createdAt)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
export default Profile;