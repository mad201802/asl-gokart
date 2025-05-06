import React from 'react';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useStore } from '@/stores/useStore';
import { Progress } from '@/components/ui/progress';
import { ButtonState } from '@/data/models';

const ButtonTesterTable = () => {
    const { buttonMappings } = useStore();

    return (
        <div>
            {buttonMappings.size > 0 ? (
                // Use map to return elements
                Array.from(buttonMappings.entries()).map(([zc_identifier, zc]) => {
                    return (
                        <div key={zc_identifier}>
                            <div className="font-black text-xl">ZC Button {zc_identifier}</div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='font-black'>Physical Button</TableHead>
                                        <TableHead className="font-black text-center">Current Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {zc.map((buttonValue: ButtonState, index) => {
                                        return (
                                            <TableRow key={index}>
                                                {/* The function currently mapped to this button */}
                                                <TableCell>Button {index}</TableCell>
                                                {/* 
                                                    The current value of the button, if boolean, represented as a grey / green dot 
                                                    or if number, as a progress bar from 0-100.
                                                */}
                                                <TableCell className="text-center">
                                                    {(typeof buttonValue[0] === 'boolean') ?
                                                        (buttonValue[0] ? <Button className='bg-green-500 hover:bg-green-500 rounded-3xl w-8 h-8' /> : <Button className='bg-gray-400 hover:bg-gray-400 rounded-3xl w-8 h-8' />) :
                                                        <Progress value={buttonValue[0] as number / 2.55} />
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    );
                })
            ) : (
                <p>There are no buttons to map</p>
            )}
        </div>
    );
};

export default ButtonTesterTable;
